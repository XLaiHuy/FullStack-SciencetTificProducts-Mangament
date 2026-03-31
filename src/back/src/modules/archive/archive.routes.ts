import { Router, Request, Response } from 'express';
import prisma from '../../prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { logBusiness } from '../../middleware/requestLogger';
import * as R from '../../utils/apiResponse';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'archive')),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

const router = Router();
router.use(authenticate);

/** GET /api/archive/dashboard */
router.get('/dashboard', requireRole('archive_staff', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const [total, archived] = await Promise.all([
      prisma.project.count({ where: { is_deleted: false } }),
      prisma.archiveRecord.count(),
    ]);
    R.ok(res, { total, archived, pending: total - archived });
  } catch (err) { R.serverError(res, (err as Error).message); }
});

/** GET /api/archive/repository */
router.get('/repository', requireRole('archive_staff', 'superadmin', 'report_viewer'), async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: Record<string, unknown> = { project: { is_deleted: false } };
    if (search) {
      where.project = {
        is_deleted: false,
        OR: [
          { title: { contains: search } },
          { code:  { contains: search } },
        ],
      };
    }

    const [total, records] = await Promise.all([
      prisma.archiveRecord.count({ where }),
      prisma.archiveRecord.findMany({
        where,
        include: {
          project: {
            select: { code: true, title: true, field: true, status: true,
                      owner: { select: { name: true } } }
          },
        },
        orderBy: { archivedAt: 'desc' },
        skip:    (pageNum - 1) * limitNum,
        take:    limitNum,
      }),
    ]);

    // Parse JSON file URLs
    const parsed = records.map(r => ({
      ...r,
      fileUrls: JSON.parse(r.fileUrlsJson || '[]') as string[],
    }));

    R.ok(res, parsed, undefined, { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { R.serverError(res, (err as Error).message); }
});

/** POST /api/archive/repository/:projectId */
router.post('/repository/:projectId',
  requireRole('archive_staff', 'superadmin'),
  upload.array('files', 10),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { notes } = req.body;
      const files = (req as Request & { files?: Express.Multer.File[] }).files as Express.Multer.File[] | undefined;

      const project = await prisma.project.findFirst({
        where: { id: projectId, status: 'da_nghiem_thu', is_deleted: false },
      });
      if (!project) throw new Error('Đề tài không tồn tại hoặc chưa được nghiệm thu.');

      const fileUrls = files?.map(f => f.path) ?? [];

      const record = await prisma.archiveRecord.upsert({
        where:  { projectId },
        create: { projectId, archivedBy: req.user!.name, fileUrlsJson: JSON.stringify(fileUrls), notes },
        update: { archivedBy: req.user!.name, fileUrlsJson: JSON.stringify(fileUrls), notes, archivedAt: new Date() },
      });

      await logBusiness(req.user!.userId, req.user!.name, `Lưu trữ đề tài ${project.code}`, 'Archive');
      R.created(res, { ...record, fileUrls }, 'Lưu trữ đề tài thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  }
);

// Standardized list endpoint
// GET /api/archives
router.get('/', requireRole('archive_staff', 'superadmin', 'report_viewer', 'project_owner'), async (req: Request, res: Response) => {
  try {
    const roleScopedWhere = req.user?.role === 'project_owner'
      ? { ownerId: req.user.userId }
      : {};

    const rows = await prisma.project.findMany({
      where: { is_deleted: false, status: 'da_nghiem_thu', ...roleScopedWhere },
      select: {
        id: true, code: true, title: true, field: true, status: true,
        owner: { select: { name: true, email: true } },
        archiveRecord: { select: { fileUrlsJson: true, archivedAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const data = rows.map((p) => ({
      ...p,
      files: JSON.parse(p.archiveRecord?.fileUrlsJson || '[]') as string[],
    }));
    R.ok(res, data);
  } catch (err) { R.serverError(res, (err as Error).message); }
});

// GET /api/archives/:topicId/download
router.get('/:topicId/download', requireRole('archive_staff', 'superadmin', 'report_viewer', 'project_owner'), async (req: Request, res: Response) => {
  try {
    const record = await prisma.archiveRecord.findFirst({
      where: { projectId: req.params.topicId },
      include: { project: { include: { owner: true } } },
    });
    if (!record) { R.notFound(res, 'Không tìm thấy hồ sơ lưu trữ.'); return; }

    const files = JSON.parse(record.fileUrlsJson || '[]') as string[];
    if (!files.length) { R.notFound(res, 'Không có tệp để tải.'); return; }
    const first = files[0];

    if (req.user?.role === 'project_owner' && record.project.ownerId !== req.user.userId) {
      R.forbidden(res, 'Bạn không có quyền tải xuống hồ sơ lưu trữ của đề tài này.');
      return;
    }

    // Lecturer internal download watermark (mapped to project_owner role)
    if (req.user?.role === 'project_owner' && first.toLowerCase().endsWith('.pdf')) {
      const raw = await fs.readFile(first);
      const pdfDoc = await PDFDocument.load(raw);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const stampDate = new Date().toLocaleString('vi-VN');
      const watermark = `LOGO_TRUONG | ${req.user.name} | ${req.user.userId} | ${stampDate}`;

      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText(watermark, {
          x: 30,
          y: height / 2,
          size: 14,
          font,
          color: rgb(0.75, 0.75, 0.75),
          opacity: 0.35,
          rotate: { type: 'degrees', angle: 25 } as never,
        });
      }
      const bytes = await pdfDoc.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(first)}"`);
      res.send(Buffer.from(bytes));
      return;
    }

    res.download(first, path.basename(first));
  } catch (err) { R.serverError(res, (err as Error).message); }
});

export default router;
