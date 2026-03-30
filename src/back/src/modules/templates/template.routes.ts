import { z } from 'zod';
import { Router, Request, Response } from 'express';
import prisma from '../../prisma';
import { logBusiness } from '../../middleware/requestLogger';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as R from '../../utils/apiResponse';
import multer from 'multer';
import path from 'path';

// ─── Multer ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'templates')),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ─── Schema ───────────────────────────────────────────────────────────────────
const CreateTemplateSchema = z.object({
  name:          z.string().min(2),
  version:       z.string().min(1),
  targetRole:    z.string().min(1),
  formTypeCode:  z.string().min(1),
  effectiveDate: z.string().datetime(),
});

import { processTemplate } from '../../utils/templateEngine';

// ─── Service ──────────────────────────────────────────────────────────────────
const TemplateService = {
  async getAll(category?: string) {
    return prisma.formTemplate.findMany({
      where: {
        isDeleted: false,
        ...(category ? { formType: { code: category } } : {}),
      },
      include: { formType: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async upload(data: z.infer<typeof CreateTemplateSchema>, filePath: string, fileSize: string, actorId: string, actorName: string) {
    const formType = await prisma.formType.upsert({
      where: { code: data.formTypeCode },
      create: { code: data.formTypeCode, name: data.formTypeCode },
      update: {},
    });
    await prisma.formTemplate.updateMany({
      where: { formTypeId: formType.id, targetRole: data.targetRole, isDefault: true, isDeleted: false },
      data: { isDefault: false },
    });
    const template = await prisma.formTemplate.create({
      data: {
        formTypeId: formType.id,
        name: data.name,
        version: data.version,
        targetRole: data.targetRole,
        fileUrl: filePath,
        size: fileSize,
        isDefault: true,
      },
    });
    await logBusiness(actorId, actorName, `Tải lên biểu mẫu ${data.name}`, 'Templates');
    return template;
  },

  async delete(id: string, actorId: string, actorName: string) {
    const t = await prisma.formTemplate.findFirst({ where: { id, isDeleted: false } });
    if (!t) throw new Error('Biểu mẫu không tồn tại.');
    await prisma.formTemplate.update({ where: { id }, data: { isDeleted: true } });
    await logBusiness(actorId, actorName, 'DELETE', 'Templates', JSON.stringify({ old_values: t }));
  },
};

// ─── Router ───────────────────────────────────────────────────────────────────
const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    R.ok(res, await TemplateService.getAll(req.query.category as string));
  } catch (err) { R.serverError(res, (err as Error).message); }
});

router.get('/form-types', async (_req: Request, res: Response) => {
  try {
    const data = await prisma.formType.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
    R.ok(res, data);
  } catch (err) { R.serverError(res, (err as Error).message); }
});

router.get('/:id/fill', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = req.query.projectId as string;
    if (!projectId) return R.badRequest(res, 'Vui lòng cung cấp projectId.');

    const template = await prisma.formTemplate.findFirst({ where: { id, isDeleted: false }, include: { formType: true } });
    if (!template) return R.notFound(res, 'Biểu mẫu không tồn tại.');

    const project = await prisma.project.findFirst({
      where: { id: projectId, is_deleted: false },
      include: { owner: true }
    });
    if (!project) return R.notFound(res, 'Đề tài không tồn tại.');

    const data = {
      project_name: project.title,
      project_code: project.code,
      owner_name: project.owner.name,
      owner_title: project.owner.title ?? '',
      department: project.department,
      field: project.field,
      budget: Number(project.budget).toLocaleString() + ' VNĐ',
      duration: `${project.durationMonths} tháng`,
      start_date: project.startDate.toLocaleDateString('vi-VN'),
      end_date: project.endDate.toLocaleDateString('vi-VN'),
    };

    const buf = processTemplate(template.fileUrl, data);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Draft_${template.name}.docx"`);
    res.send(buf);
  } catch (err) {
    R.serverError(res, (err as Error).message);
  }
});

router.post('/',
  requireRole('research_staff', 'superadmin'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) { R.badRequest(res, 'Vui lòng chọn file.'); return; }
      const body = CreateTemplateSchema.parse(req.body);
      const sizeKb = `${Math.round(file.size / 1024)} KB`;
      const t = await TemplateService.upload(body, file.path, sizeKb, req.user!.userId, req.user!.name);
      R.created(res, t, 'Tải lên biểu mẫu thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  }
);

router.delete('/:id',
  requireRole('research_staff', 'superadmin'),
  async (req: Request, res: Response) => {
    try {
      await TemplateService.delete(req.params.id, req.user!.userId, req.user!.name);
      R.ok(res, null, 'Đã xóa biểu mẫu.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  }
);

export default router;
