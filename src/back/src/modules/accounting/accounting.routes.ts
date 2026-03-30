import { Router, Request, Response } from 'express';
import prisma from '../../prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { logBusiness } from '../../middleware/requestLogger';
import * as R from '../../utils/apiResponse';

const router = Router();
router.use(authenticate);

/** GET /api/accounting/dashboard */
router.get('/dashboard', requireRole('accounting', 'superadmin'), async (_req: Request, res: Response) => {
  try {
    const [totalSettlements, pendingSettlements, confirmedSettlements] = await Promise.all([
      prisma.settlement.count({ where: { is_deleted: false } }),
      prisma.settlement.count({ where: { status: 'cho_bo_sung', is_deleted: false } }),
      prisma.settlement.count({ where: { status: 'da_xac_nhan', is_deleted: false } }),
    ]);

    const budgetAgg = await prisma.settlement.aggregate({
      where: { is_deleted: false },
      _sum: { totalAmount: true },
    });

    R.ok(res, {
      totalSettlements,
      pendingSettlements,
      confirmedSettlements,
      totalAmount: Number(budgetAgg._sum.totalAmount ?? 0),
    });
  } catch (err) { R.serverError(res, (err as Error).message); }
});

/** GET /api/accounting/documents — all settlements with their budget items */
router.get('/documents', requireRole('accounting', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const where: Record<string, unknown> = { is_deleted: false };
    if (status) where.status = status;

    const [total, docs] = await Promise.all([
      prisma.settlement.count({ where }),
      prisma.settlement.findMany({
        where,
        include: {
          budgetItems: true,
          project: { select: { code: true, title: true, owner: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    R.ok(res, docs, undefined, { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { R.serverError(res, (err as Error).message); }
});

/** PUT /api/accounting/documents/:id/verify */
router.put('/documents/:id/verify',
  requireRole('accounting', 'superadmin'),
  async (req: Request, res: Response) => {
    try {
      const { status, notes } = req.body;
      const validStatuses = ['hop_le', 'cho_bo_sung', 'da_xac_nhan', 'hoa_don_vat'];
      if (!validStatuses.includes(status)) {
        R.badRequest(res, `Trạng thái không hợp lệ. Hợp lệ: ${validStatuses.join(', ')}`);
        return;
      }

      const settlement = await prisma.settlement.findFirst({
        where: { id: req.params.id, is_deleted: false },
      });
      if (!settlement) { R.notFound(res, 'Hồ sơ không tồn tại.'); return; }

      const updated = await prisma.settlement.update({
        where: { id: req.params.id },
        data: {
          status: status as never,
          auditLog: {
            create: [{
              content: `Kế toán xác nhận: ${settlement.status} → ${status}${notes ? `. Ghi chú: ${notes}` : ''}.`,
              author:  req.user!.name,
            }],
          },
        },
      });

      await logBusiness(req.user!.userId, req.user!.name, `Kế toán xác nhận QT ${settlement.code}: ${status}`, 'Accounting');
      R.ok(res, updated, 'Cập nhật xác nhận kế toán thành công.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  }
);

/** POST /api/accounting/liquidation/:id/confirm */
router.post('/liquidation/:id/confirm',
  requireRole('accounting', 'superadmin'),
  async (req: Request, res: Response) => {
    try {
      const settlement = await prisma.settlement.findFirst({
        where: { id: req.params.id, is_deleted: false },
        include: { project: true },
      });
      if (!settlement) { R.notFound(res, 'Hồ sơ không tồn tại.'); return; }

      const updated = await prisma.settlement.update({
        where: { id: req.params.id },
        data: {
          status: 'da_xac_nhan',
          auditLog: {
            create: [{
              content: `Xác nhận thanh lý quyết toán bởi ${req.user!.name}.`,
              author:  req.user!.name,
            }],
          },
        },
      });

      await logBusiness(req.user!.userId, req.user!.name,
        `Xác nhận thanh lý QT ${settlement.code} cho đề tài ${settlement.project.code}`,
        'Accounting'
      );
      R.ok(res, updated, 'Đã xác nhận thanh lý quyết toán.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  }
);

export default router;
