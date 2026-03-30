import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma';
import { hashPassword } from '../../utils/password';
import { logBusiness } from '../../middleware/requestLogger';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as R from '../../utils/apiResponse';

const router = Router();
router.use(authenticate, requireRole('superadmin'));

// ─── Schemas ──────────────────────────────────────────────────────────────────
const CreateUserSchema = z.object({
  name:        z.string().min(2),
  email:       z.string().email(),
  password:    z.string().min(6),
  role:        z.enum(['research_staff','project_owner','council_member','accounting','archive_staff','report_viewer','superadmin']),
  councilRole: z.enum(['chairman','reviewer','secretary','member']).optional(),
  title:       z.string().optional(),
  department:  z.string().optional(),
});

const UpdateUserSchema = CreateUserSchema.omit({ password: true }).partial();

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [totalUsers, activeUsers, totalProjects, auditLogsToday] = await Promise.all([
      prisma.user.count({ where: { is_deleted: false } }),
      prisma.user.count({ where: { isActive: true, is_deleted: false } }),
      prisma.project.count({ where: { is_deleted: false } }),
      prisma.auditLog.count({
        where: { timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);
    R.ok(res, { totalUsers, activeUsers, totalProjects, auditLogsToday });
  } catch (err) { R.serverError(res, (err as Error).message); }
});

// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { search, role, page = '1', limit = '30' } = req.query;
    const pageNum  = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: Record<string, unknown> = { is_deleted: false };
    if (role)   where.role = role;
    if (search) {
      where.OR = [
        { name:  { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: { id:true, name:true, email:true, role:true, councilRole:true,
                  title:true, department:true, isActive:true, isLocked:true, createdAt:true },
        orderBy: { createdAt: 'desc' },
        skip:    (pageNum - 1) * limitNum,
        take:    limitNum,
      }),
    ]);

    R.ok(res, users, undefined, { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { R.serverError(res, (err as Error).message); }
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const body = CreateUserSchema.parse(req.body);
    const existing = await prisma.user.findFirst({ where: { email: body.email } });
    if (existing) { R.conflict(res, 'Email đã được sử dụng.'); return; }

    const user = await prisma.user.create({
      data: { ...body, passwordHash: await hashPassword(body.password), password: undefined } as never,
      select: { id:true, name:true, email:true, role:true, councilRole:true, title:true, department:true },
    });

    await logBusiness(req.user!.userId, req.user!.name, `Tạo tài khoản ${body.email}`, 'Admin');
    R.created(res, user, 'Tạo tài khoản thành công.');
  } catch (err) { R.badRequest(res, (err as Error).message); }
});

router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const body = UpdateUserSchema.parse(req.body);
    const user = await prisma.user.findFirst({ where: { id: req.params.id, is_deleted: false } });
    if (!user) { R.notFound(res, 'Người dùng không tồn tại.'); return; }

    const updated = await prisma.user.update({
      where:  { id: req.params.id },
      data:   body,
      select: { id:true, name:true, email:true, role:true, councilRole:true, title:true, department:true },
    });

    await logBusiness(req.user!.userId, req.user!.name, `Cập nhật tài khoản ${user.email}`, 'Admin');
    R.ok(res, updated, 'Cập nhật tài khoản thành công.');
  } catch (err) { R.badRequest(res, (err as Error).message); }
});

router.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const { newPassword = '123456' } = req.body;
    const user = await prisma.user.findFirst({ where: { id: req.params.id, is_deleted: false } });
    if (!user) { R.notFound(res, 'Người dùng không tồn tại.'); return; }

    await prisma.user.update({
      where: { id: req.params.id },
      data:  { passwordHash: await hashPassword(newPassword) },
    });
    // Invalidate sessions
    await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });

    await logBusiness(req.user!.userId, req.user!.name, `Đặt lại mật khẩu cho ${user.email}`, 'Admin');
    R.ok(res, null, 'Đặt lại mật khẩu thành công.');
  } catch (err) { R.badRequest(res, (err as Error).message); }
});

router.put('/users/:id/lock', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, is_deleted: false } });
    if (!user) { R.notFound(res, 'Người dùng không tồn tại.'); return; }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data:  { isLocked: !user.isLocked },
    });

    await logBusiness(req.user!.userId, req.user!.name,
      `${updated.isLocked ? 'Khóa' : 'Mở khóa'} tài khoản ${user.email}`, 'Admin'
    );
    R.ok(res, { isLocked: updated.isLocked }, `${updated.isLocked ? 'Khóa' : 'Mở khóa'} tài khoản thành công.`);
  } catch (err) { R.badRequest(res, (err as Error).message); }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, is_deleted: false } });
    if (!user) { R.notFound(res, 'Người dùng không tồn tại.'); return; }
    if (req.params.id === req.user!.userId) { R.badRequest(res, 'Không thể xóa chính mình.'); return; }

    await prisma.user.update({ where: { id: req.params.id }, data: { is_deleted: true } });
    await logBusiness(req.user!.userId, req.user!.name, 'DELETE', 'Admin', JSON.stringify({ old_values: user }));
    R.ok(res, null, 'Đã xóa tài khoản.');
  } catch (err) { R.badRequest(res, (err as Error).message); }
});

// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const cats = await prisma.category.findMany({
      where:   { ...(req.query.type ? { type: req.query.type as string } : {}), isActive: true },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });
    R.ok(res, cats);
  } catch (err) { R.serverError(res, (err as Error).message); }
});

router.post('/categories', async (req: Request, res: Response) => {
  try {
    const cat = await prisma.category.create({ data: req.body });
    R.created(res, cat, 'Tạo danh mục thành công.');
  } catch (err) { R.badRequest(res, (err as Error).message); }
});

router.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const cat = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
    R.ok(res, cat, 'Cập nhật danh mục thành công.');
  } catch (err) { R.badRequest(res, (err as Error).message); }
});

router.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } });
    R.ok(res, null, 'Đã ẩn danh mục.');
  } catch (err) { R.badRequest(res, (err as Error).message); }
});

// ─── System Config ────────────────────────────────────────────────────────────
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
    R.ok(res, configs);
  } catch (err) { R.serverError(res, (err as Error).message); }
});

router.put('/config', async (req: Request, res: Response) => {
  try {
    const updates = req.body as { key: string; value: string }[];
    if (!Array.isArray(updates)) { R.badRequest(res, 'Body phải là mảng [{key, value}]'); return; }

    await Promise.all(
      updates.map(({ key, value }) =>
        prisma.systemConfig.upsert({
          where:  { key },
          create: { key, value },
          update: { value },
        })
      )
    );

    await logBusiness(req.user!.userId, req.user!.name, 'Cập nhật cấu hình hệ thống', 'Admin');
    R.ok(res, null, 'Cập nhật cấu hình thành công.');
  } catch (err) { R.badRequest(res, (err as Error).message); }
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { module, user: userName, page = '1', limit = '50' } = req.query;
    const pageNum  = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: Record<string, unknown> = {};
    if (module)   where.module   = module;
    if (userName) where.userName = { contains: userName };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip:    (pageNum - 1) * limitNum,
        take:    limitNum,
      }),
    ]);

    R.ok(res, logs, undefined, { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { R.serverError(res, (err as Error).message); }
});

export default router;
