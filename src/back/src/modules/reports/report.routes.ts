import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as R from '../../utils/apiResponse';

const router = Router();
router.use(authenticate);

const ProjectStatusSchema = z.enum([
  'dang_thuc_hien',
  'tre_han',
  'cho_nghiem_thu',
  'da_nghiem_thu',
  'da_thanh_ly',
  'huy_bo',
]);

const ExportTypeSchema = z.enum([
  'topic-summary',
  'contract-list',
  'budget-report',
  'completion-rate',
  'overdue-list',
]);

const QueryStringSchema = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.string().trim().min(1),
);

const OptionalQueryStringSchema = QueryStringSchema.optional();

const ExportQuerySchema = z.object({
  type: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    ExportTypeSchema.default('topic-summary'),
  ),
  format: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.enum(['csv', 'excel', 'xlsx']).default('excel'),
  ),
  schoolYear: OptionalQueryStringSchema,
  field: OptionalQueryStringSchema,
  department: OptionalQueryStringSchema,
  status: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    ProjectStatusSchema.optional(),
  ),
});

const toIsoDate = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

const toNumber = (value: unknown) => Number(value ?? 0);

const parseSchoolYearRange = (schoolYear?: string) => {
  if (!schoolYear) return null;
  const match = schoolYear.match(/^(\d{4})(?:-(\d{4}))?$/);
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2] ?? match[1]);
  return {
    gte: new Date(`${startYear}-01-01T00:00:00.000Z`),
    lte: new Date(`${endYear}-12-31T23:59:59.999Z`),
  };
};

const buildProjectWhere = (query: {
  status?: z.infer<typeof ProjectStatusSchema>;
  field?: string;
  department?: string;
  schoolYear?: string;
}): Prisma.ProjectWhereInput => {
  const where: Prisma.ProjectWhereInput = { is_deleted: false };

  const status = query.status;
  const field = query.field;
  const department = query.department;
  const schoolYear = query.schoolYear;

  if (status) where.status = status;
  if (field) where.field = { contains: field };
  if (department) where.department = { contains: department };

  const range = parseSchoolYearRange(schoolYear);
  if (range) where.startDate = { gte: range.gte, lte: range.lte };

  return where;
};

const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const toCsv = (columns: string[], rows: Array<Record<string, unknown>>) => {
  const lines = [
    columns.map(csvEscape).join(','),
    ...rows.map((row) => columns.map((col) => csvEscape(row[col])).join(',')),
  ];
  return `\uFEFF${lines.join('\n')}`;
};

const sendCsv = (res: Response, filename: string, columns: string[], rows: Array<Record<string, unknown>>) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  res.send(toCsv(columns, rows));
};

const sendXlsx = async (
  res: Response,
  filename: string,
  columns: string[],
  rows: Array<Record<string, unknown>>,
) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  sheet.columns = columns.map((col) => ({ header: col, key: col, width: Math.max(16, col.length + 4) }));
  for (const row of rows) sheet.addRow(row);
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  res.send(Buffer.from(buffer as ArrayBuffer));
};

/** GET /api/reports/dashboard */
router.get(
  '/dashboard',
  requireRole('report_viewer', 'research_staff', 'superadmin', 'accounting'),
  async (_req: Request, res: Response) => {
    try {
      const [
        totalProjects,
        activeProjects,
        overdueProjects,
        completedProjects,
        totalContracts,
        activeContracts,
        pendingContracts,
      ] = await Promise.all([
        prisma.project.count({ where: { is_deleted: false } }),
        prisma.project.count({ where: { status: 'dang_thuc_hien', is_deleted: false } }),
        prisma.project.count({ where: { status: 'tre_han', is_deleted: false } }),
        prisma.project.count({ where: { status: 'da_nghiem_thu', is_deleted: false } }),
        prisma.contract.count({ where: { is_deleted: false } }),
        prisma.contract.count({ where: { status: 'da_ky', is_deleted: false } }),
        prisma.contract.count({ where: { status: 'cho_duyet', is_deleted: false } }),
      ]);

      const [budgetAgg, advancedAgg] = await Promise.all([
        prisma.project.aggregate({ where: { is_deleted: false }, _sum: { budget: true } }),
        prisma.project.aggregate({ where: { is_deleted: false }, _sum: { advancedAmount: true } }),
      ]);

      R.ok(res, {
        totalProjects,
        activeProjects,
        overdueProjects,
        completedProjects,
        totalBudget: Number(budgetAgg._sum.budget ?? 0),
        disbursedBudget: Number(advancedAgg._sum.advancedAmount ?? 0),
        totalContracts,
        activeContracts,
        pendingContracts,
      });
    } catch (err) {
      R.serverError(res, (err as Error).message);
    }
  },
);

router.get(
  '/stats',
  requireRole('report_viewer', 'research_staff', 'superadmin', 'accounting'),
  async (_req: Request, res: Response) => {
    try {
      const [
        totalProjects,
        activeProjects,
        overdueProjects,
        completedProjects,
        totalContracts,
        activeContracts,
        pendingContracts,
      ] = await Promise.all([
        prisma.project.count({ where: { is_deleted: false } }),
        prisma.project.count({ where: { status: 'dang_thuc_hien', is_deleted: false } }),
        prisma.project.count({ where: { status: 'tre_han', is_deleted: false } }),
        prisma.project.count({ where: { status: 'da_nghiem_thu', is_deleted: false } }),
        prisma.contract.count({ where: { is_deleted: false } }),
        prisma.contract.count({ where: { status: 'da_ky', is_deleted: false } }),
        prisma.contract.count({ where: { status: 'cho_duyet', is_deleted: false } }),
      ]);
      const [budgetAgg, advancedAgg] = await Promise.all([
        prisma.project.aggregate({ where: { is_deleted: false }, _sum: { budget: true } }),
        prisma.project.aggregate({ where: { is_deleted: false }, _sum: { advancedAmount: true } }),
      ]);
      R.ok(res, {
        totalProjects,
        activeProjects,
        overdueProjects,
        completedProjects,
        totalBudget: Number(budgetAgg._sum.budget ?? 0),
        disbursedBudget: Number(advancedAgg._sum.advancedAmount ?? 0),
        totalContracts,
        activeContracts,
        pendingContracts,
      });
    } catch (err) {
      R.serverError(res, (err as Error).message);
    }
  },
);

/** GET /api/reports/topics */
router.get(
  '/topics',
  requireRole('report_viewer', 'research_staff', 'superadmin'),
  async (_req: Request, res: Response) => {
    try {
      const groups = await prisma.project.groupBy({
        by: ['field'],
        where: { is_deleted: false },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });
      R.ok(res, groups.map((g) => ({ field: g.field, count: g._count.id })));
    } catch (err) {
      R.serverError(res, (err as Error).message);
    }
  },
);

/** GET /api/reports/progress */
router.get(
  '/progress',
  requireRole('report_viewer', 'research_staff', 'superadmin'),
  async (_req: Request, res: Response) => {
    try {
      const groups = await prisma.project.groupBy({
        by: ['status'],
        where: { is_deleted: false },
        _count: { id: true },
      });
      R.ok(res, groups.map((g) => ({ status: g.status, count: g._count.id })));
    } catch (err) {
      R.serverError(res, (err as Error).message);
    }
  },
);

/** GET /api/reports/contracts */
router.get(
  '/contracts',
  requireRole('report_viewer', 'research_staff', 'superadmin', 'accounting'),
  async (_req: Request, res: Response) => {
    try {
      const groups = await prisma.contract.groupBy({
        by: ['status'],
        where: { is_deleted: false },
        _count: { id: true },
        _sum: { budget: true },
      });
      R.ok(
        res,
        groups.map((g) => ({
          status: g.status,
          count: g._count.id,
          totalBudget: Number(g._sum.budget ?? 0),
        })),
      );
    } catch (err) {
      R.serverError(res, (err as Error).message);
    }
  },
);

/** GET /api/reports/filter-options */
router.get(
  '/filter-options',
  requireRole('report_viewer', 'research_staff', 'superadmin', 'accounting'),
  async (_req: Request, res: Response) => {
    try {
      const [yearCategories, fieldCategories, projectDistinct] = await Promise.all([
        prisma.category.findMany({
          where: { type: 'academic_year', isActive: true },
          select: { value: true, sortOrder: true },
          orderBy: [{ sortOrder: 'asc' }, { value: 'desc' }],
        }),
        prisma.category.findMany({
          where: { type: 'field', isActive: true },
          select: { value: true, sortOrder: true },
          orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
        }),
        prisma.project.findMany({
          where: { is_deleted: false },
          select: { field: true, department: true, status: true, startDate: true },
        }),
      ]);

      const schoolYearsFromProjects = Array.from(
        new Set(
          projectDistinct
            .map((item) => item.startDate?.getUTCFullYear())
            .filter((value): value is number => typeof value === 'number')
            .map((year) => `${year}-${year + 1}`),
        ),
      ).sort((a, b) => b.localeCompare(a));

      const schoolYears = yearCategories.length
        ? yearCategories.map((item) => item.value)
        : schoolYearsFromProjects;

      const fields = fieldCategories.length
        ? fieldCategories.map((item) => item.value)
        : Array.from(new Set(projectDistinct.map((item) => item.field).filter(Boolean))).sort();

      const departments = Array.from(
        new Set(projectDistinct.map((item) => item.department).filter(Boolean)),
      ).sort();

      const statuses = ProjectStatusSchema.options;

      R.ok(res, { schoolYears, fields, departments, statuses });
    } catch (err) {
      R.serverError(res, (err as Error).message);
    }
  },
);

/** GET /api/reports/export?type=&format= */
router.get(
  '/export',
  requireRole('report_viewer', 'research_staff', 'superadmin'),
  async (req: Request, res: Response) => {
    try {
      const query = ExportQuerySchema.parse(req.query);
      const type = query.type;
      const format = query.format === 'csv' ? 'csv' : 'xlsx';

      let columns: string[] = [];
      let rows: Array<Record<string, unknown>> = [];
      const projectWhere = buildProjectWhere(query);

      if (type === 'contract-list') {
        const contracts = await prisma.contract.findMany({
          where: {
            is_deleted: false,
            project: { is: projectWhere },
          },
          include: { project: { include: { owner: true } } },
          orderBy: { createdAt: 'desc' },
        });
        columns = ['Ma hop dong', 'Ma de tai', 'Ten de tai', 'Chu nhiem', 'Trang thai', 'Kinh phi', 'Ngay ky'];
        rows = contracts.map((c) => ({
          'Ma hop dong': c.code,
          'Ma de tai': c.project?.code ?? '',
          'Ten de tai': c.project?.title ?? '',
          'Chu nhiem': c.project?.owner?.name ?? '',
          'Trang thai': c.status,
          'Kinh phi': toNumber(c.budget),
          'Ngay ky': toIsoDate(c.signedDate),
        }));
      } else if (type === 'budget-report') {
        const projects = await prisma.project.findMany({
          where: projectWhere,
          include: { owner: true },
          orderBy: { createdAt: 'desc' },
        });
        columns = ['Ma de tai', 'Ten de tai', 'Chu nhiem', 'Kinh phi', 'Da tam ung', 'Con lai', 'Trang thai'];
        rows = projects.map((p) => {
          const budget = toNumber(p.budget);
          const advanced = toNumber(p.advancedAmount);
          return {
            'Ma de tai': p.code,
            'Ten de tai': p.title,
            'Chu nhiem': p.owner?.name ?? '',
            'Kinh phi': budget,
            'Da tam ung': advanced,
            'Con lai': budget - advanced,
            'Trang thai': p.status,
          };
        });
      } else if (type === 'completion-rate') {
        const projects = await prisma.project.findMany({
          where: projectWhere,
          select: { field: true, status: true },
        });
        const byField = new Map<string, { total: number; completed: number; overdue: number }>();
        for (const p of projects) {
          const item = byField.get(p.field) ?? { total: 0, completed: 0, overdue: 0 };
          item.total += 1;
          if (p.status === 'da_nghiem_thu') item.completed += 1;
          if (p.status === 'tre_han') item.overdue += 1;
          byField.set(p.field, item);
        }
        columns = ['Linh vuc', 'Tong so', 'Da nghiem thu', 'Tre han', 'Ty le nghiem thu (%)'];
        rows = Array.from(byField.entries()).map(([field, item]) => ({
          'Linh vuc': field,
          'Tong so': item.total,
          'Da nghiem thu': item.completed,
          'Tre han': item.overdue,
          'Ty le nghiem thu (%)': item.total ? Number(((item.completed / item.total) * 100).toFixed(2)) : 0,
        }));
      } else if (type === 'overdue-list') {
        const projects = await prisma.project.findMany({
          where: { ...projectWhere, status: 'tre_han' },
          include: { owner: true },
          orderBy: { endDate: 'asc' },
        });
        columns = ['Ma de tai', 'Ten de tai', 'Chu nhiem', 'Don vi', 'Ngay bat dau', 'Ngay ket thuc', 'Trang thai'];
        rows = projects.map((p) => ({
          'Ma de tai': p.code,
          'Ten de tai': p.title,
          'Chu nhiem': p.owner?.name ?? '',
          'Don vi': p.department,
          'Ngay bat dau': toIsoDate(p.startDate),
          'Ngay ket thuc': toIsoDate(p.endDate),
          'Trang thai': p.status,
        }));
      } else {
        const projects = await prisma.project.findMany({
          where: projectWhere,
          include: { owner: true },
          orderBy: { createdAt: 'desc' },
        });
        columns = [
          'Ma de tai',
          'Ten de tai',
          'Chu nhiem',
          'Don vi',
          'Linh vuc',
          'Trang thai',
          'Kinh phi',
          'Ngay bat dau',
          'Ngay ket thuc',
        ];
        rows = projects.map((p) => ({
          'Ma de tai': p.code,
          'Ten de tai': p.title,
          'Chu nhiem': p.owner?.name ?? '',
          'Don vi': p.department,
          'Linh vuc': p.field,
          'Trang thai': p.status,
          'Kinh phi': toNumber(p.budget),
          'Ngay bat dau': toIsoDate(p.startDate),
          'Ngay ket thuc': toIsoDate(p.endDate),
        }));
      }

      const dateStamp = new Date().toISOString().slice(0, 10);
      const baseName = `report_${type.replace(/[^a-z0-9_-]+/gi, '_')}_${dateStamp}`;
      if (format === 'csv') {
        sendCsv(res, baseName, columns, rows);
        return;
      }
      await sendXlsx(res, baseName, columns, rows);
    } catch (err) {
      if (err instanceof z.ZodError) {
        R.badRequest(res, err.issues.map((issue) => issue.message).join('; '));
        return;
      }
      R.serverError(res, (err as Error).message);
    }
  },
);

export default router;
