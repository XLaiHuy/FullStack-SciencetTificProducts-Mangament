import { Router, Request, Response } from 'express';
import prisma from '../../prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as R from '../../utils/apiResponse';

const router = Router();
router.use(authenticate);

/** GET /api/reports/dashboard */
router.get('/dashboard',
  requireRole('report_viewer', 'research_staff', 'superadmin', 'accounting'),
  async (_req: Request, res: Response) => {
    try {
      const [
        totalProjects, activeProjects, overdueProjects,
        completedProjects, totalContracts, activeContracts, pendingContracts,
      ] = await Promise.all([
        prisma.project.count({ where: { is_deleted: false } }),
        prisma.project.count({ where: { status: 'dang_thuc_hien',  is_deleted: false } }),
        prisma.project.count({ where: { status: 'tre_han',         is_deleted: false } }),
        prisma.project.count({ where: { status: 'da_nghiem_thu',   is_deleted: false } }),
        prisma.contract.count({ where: { is_deleted: false } }),
        prisma.contract.count({ where: { status: 'da_ky',          is_deleted: false } }),
        prisma.contract.count({ where: { status: 'cho_duyet',      is_deleted: false } }),
      ]);

      const [budgetAgg, advancedAgg] = await Promise.all([
        prisma.project.aggregate({ where: { is_deleted: false }, _sum: { budget: true } }),
        prisma.project.aggregate({ where: { is_deleted: false }, _sum: { advancedAmount: true } }),
      ]);

      R.ok(res, {
        totalProjects, activeProjects, overdueProjects, completedProjects,
        totalBudget:     Number(budgetAgg._sum.budget ?? 0),
        disbursedBudget: Number(advancedAgg._sum.advancedAmount ?? 0),
        totalContracts, activeContracts, pendingContracts,
      });
    } catch (err) { R.serverError(res, (err as Error).message); }
  }
);

// Standardized alias
router.get('/stats',
  requireRole('report_viewer', 'research_staff', 'superadmin', 'accounting'),
  async (_req: Request, res: Response) => {
    try {
      const [
        totalProjects, activeProjects, overdueProjects,
        completedProjects, totalContracts, activeContracts, pendingContracts,
      ] = await Promise.all([
        prisma.project.count({ where: { is_deleted: false } }),
        prisma.project.count({ where: { status: 'dang_thuc_hien',  is_deleted: false } }),
        prisma.project.count({ where: { status: 'tre_han',         is_deleted: false } }),
        prisma.project.count({ where: { status: 'da_nghiem_thu',   is_deleted: false } }),
        prisma.contract.count({ where: { is_deleted: false } }),
        prisma.contract.count({ where: { status: 'da_ky',          is_deleted: false } }),
        prisma.contract.count({ where: { status: 'cho_duyet',      is_deleted: false } }),
      ]);
      const [budgetAgg, advancedAgg] = await Promise.all([
        prisma.project.aggregate({ where: { is_deleted: false }, _sum: { budget: true } }),
        prisma.project.aggregate({ where: { is_deleted: false }, _sum: { advancedAmount: true } }),
      ]);
      R.ok(res, {
        totalProjects, activeProjects, overdueProjects, completedProjects,
        totalBudget: Number(budgetAgg._sum.budget ?? 0),
        disbursedBudget: Number(advancedAgg._sum.advancedAmount ?? 0),
        totalContracts, activeContracts, pendingContracts,
      });
    } catch (err) { R.serverError(res, (err as Error).message); }
  }
);

/** GET /api/reports/topics — projects grouped by field */
router.get('/topics',
  requireRole('report_viewer', 'research_staff', 'superadmin'),
  async (_req: Request, res: Response) => {
    try {
      const groups = await prisma.project.groupBy({
        by:     ['field'],
        where:  { is_deleted: false },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });
      R.ok(res, groups.map(g => ({ field: g.field, count: g._count.id })));
    } catch (err) { R.serverError(res, (err as Error).message); }
  }
);

/** GET /api/reports/progress — projects grouped by status */
router.get('/progress',
  requireRole('report_viewer', 'research_staff', 'superadmin'),
  async (_req: Request, res: Response) => {
    try {
      const groups = await prisma.project.groupBy({
        by:    ['status'],
        where: { is_deleted: false },
        _count: { id: true },
      });
      R.ok(res, groups.map(g => ({ status: g.status, count: g._count.id })));
    } catch (err) { R.serverError(res, (err as Error).message); }
  }
);

/** GET /api/reports/contracts — contracts grouped by status */
router.get('/contracts',
  requireRole('report_viewer', 'research_staff', 'superadmin', 'accounting'),
  async (_req: Request, res: Response) => {
    try {
      const groups = await prisma.contract.groupBy({
        by:    ['status'],
        where: { is_deleted: false },
        _count: { id: true },
        _sum:   { budget: true },
      });
      R.ok(res, groups.map(g => ({
        status: g.status,
        count:  g._count.id,
        totalBudget: Number(g._sum.budget ?? 0),
      })));
    } catch (err) { R.serverError(res, (err as Error).message); }
  }
);

/** GET /api/reports/export */
router.get('/export',
  requireRole('report_viewer', 'research_staff', 'superadmin'),
  async (req: Request, res: Response) => {
    try {
      const { type = 'projects', format = 'excel' } = req.query;
      // Future: real Excel/PDF generation
      R.ok(res, {
        url:    `#mock-export-${type}-${format}`,
        type, format,
        mock:   true,
        message: 'Xuất báo cáo mock. Tích hợp ExcelJS/PDF thực tế ở phase sau.',
      });
    } catch (err) { R.serverError(res, (err as Error).message); }
  }
);

export default router;
