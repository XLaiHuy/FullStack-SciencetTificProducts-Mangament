import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import prisma from '../../prisma';
import { hashPassword } from '../../utils/password';
import { logBusiness } from '../../middleware/requestLogger';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as R from '../../utils/apiResponse';

const router = Router();
router.use(authenticate, requireRole('superadmin'));

const AdminRoleValues = [
  'research_staff',
  'project_owner',
  'council_member',
  'accounting',
  'archive_staff',
  'report_viewer',
  'superadmin',
] as const;

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(AdminRoleValues),
  councilRole: z.enum(['chairman', 'reviewer', 'secretary', 'member']).optional(),
  title: z.string().optional(),
  department: z.string().optional(),
});

const UpdateUserSchema = CreateUserSchema.omit({ password: true }).partial();

const ResetPasswordSchema = z.object({
  temporaryPassword: z.string().min(6),
});

const CategoryCreateSchema = z.object({
  type: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(200),
  label: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
}).strict();

const CategoryUpdateSchema = CategoryCreateSchema.partial().strict();

const ConfigItemSchema = z.object({
  key: z.string().trim().min(1).max(100),
  value: z.string().trim().max(2_000),
  label: z.string().trim().min(1).max(200).optional(),
}).strict();

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalUsers, activeUsers, lockedUsers, totalProjects, auditLogsToday, roleGroups] =
      await Promise.all([
        prisma.user.count({ where: { is_deleted: false } }),
        prisma.user.count({ where: { isActive: true, is_deleted: false } }),
        prisma.user.count({ where: { isLocked: true, is_deleted: false } }),
        prisma.project.count({ where: { is_deleted: false } }),
        prisma.auditLog.count({ where: { timestamp: { gte: startOfToday } } }),
        prisma.user.groupBy({
          by: ['role'],
          where: { is_deleted: false },
          _count: { _all: true },
        }),
      ]);

    const roleCounts: Record<UserRole, number> = {
      research_staff: 0,
      project_owner: 0,
      council_member: 0,
      accounting: 0,
      archive_staff: 0,
      report_viewer: 0,
      superadmin: 0,
    };
    for (const row of roleGroups) {
      roleCounts[row.role] = row._count._all;
    }

    R.ok(res, { totalUsers, activeUsers, lockedUsers, totalProjects, auditLogsToday, roleCounts });
  } catch (err) {
    R.serverError(res, (err as Error).message);
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const { search, role, page = '1', limit = '30' } = req.query;
    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit as string, 10) || 30, 1);

    const where: Record<string, unknown> = { is_deleted: false };
    if (role) {
      if (typeof role !== 'string' || !AdminRoleValues.includes(role as (typeof AdminRoleValues)[number])) {
        R.badRequest(res, 'Vai tro loc khong hop le.');
        return;
      }
      where.role = role;
    }
    if (search) {
      where.OR = [{ name: { contains: search } }, { email: { contains: search } }];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          councilRole: true,
          title: true,
          department: true,
          isActive: true,
          isLocked: true,
          createdAt: true,
          mustChangePassword: true as never,
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    R.ok(res, users, undefined, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    R.serverError(res, (err as Error).message);
  }
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const body = CreateUserSchema.parse(req.body);
    const normalizedEmail = body.email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({ where: { email: normalizedEmail } });
    if (existing) {
      R.conflict(res, 'Email da duoc su dung.');
      return;
    }

    const created = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email: normalizedEmail,
        passwordHash: await hashPassword(body.password),
        role: body.role,
        councilRole: body.role === 'council_member' ? body.councilRole ?? 'member' : null,
        title: body.title?.trim() || null,
        department: body.department?.trim() || null,
        isActive: true,
        isLocked: false,
        mustChangePassword: true as never,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        councilRole: true,
        title: true,
        department: true,
        mustChangePassword: true as never,
      },
    });

    await logBusiness(req.user!.userId, req.user!.name, `Tao tai khoan ${created.email}`, 'Admin');
    R.created(res, created, 'Tao tai khoan thanh cong.');
  } catch (err) {
    R.badRequest(res, (err as Error).message);
  }
});

router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const body = UpdateUserSchema.parse(req.body);
    const user = await prisma.user.findFirst({ where: { id: req.params.id, is_deleted: false } });
    if (!user) {
      R.notFound(res, 'Nguoi dung khong ton tai.');
      return;
    }

    const normalizedEmail = body.email?.trim().toLowerCase();
    if (normalizedEmail && normalizedEmail !== user.email) {
      const dup = await prisma.user.findFirst({
        where: { email: normalizedEmail, is_deleted: false, NOT: { id: req.params.id } },
        select: { id: true },
      });
      if (dup) {
        R.conflict(res, 'Email da duoc su dung boi tai khoan khac.');
        return;
      }
    }

    const nextRole = body.role ?? user.role;
    const nextCouncilRole =
      nextRole === 'council_member'
        ? body.councilRole ?? user.councilRole ?? 'member'
        : null;

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        councilRole: nextCouncilRole,
        ...(body.title !== undefined ? { title: body.title?.trim() || null } : {}),
        ...(body.department !== undefined ? { department: body.department?.trim() || null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        councilRole: true,
        title: true,
        department: true,
        mustChangePassword: true as never,
      },
    });

    await logBusiness(req.user!.userId, req.user!.name, `Cap nhat tai khoan ${user.email}`, 'Admin');
    R.ok(res, updated, 'Cap nhat tai khoan thanh cong.');
  } catch (err) {
    R.badRequest(res, (err as Error).message);
  }
});

router.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const { temporaryPassword } = ResetPasswordSchema.parse(req.body);
    const user = await prisma.user.findFirst({ where: { id: req.params.id, is_deleted: false } });
    if (!user) {
      R.notFound(res, 'Nguoi dung khong ton tai.');
      return;
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: {
        passwordHash: await hashPassword(temporaryPassword),
        mustChangePassword: true as never,
      },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });

    await logBusiness(req.user!.userId, req.user!.name, `Dat mat khau tam thoi cho ${user.email}`, 'Admin');
    R.ok(res, null, 'Dat lai mat khau tam thoi thanh cong.');
  } catch (err) {
    R.badRequest(res, (err as Error).message);
  }
});

router.put('/users/:id/lock', async (req: Request, res: Response) => {
  try {
    if (req.params.id === req.user!.userId) {
      R.badRequest(res, 'Khong the tu khoa tai khoan dang dang nhap.');
      return;
    }

    const user = await prisma.user.findFirst({ where: { id: req.params.id, is_deleted: false } });
    if (!user) {
      R.notFound(res, 'Nguoi dung khong ton tai.');
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isLocked: !user.isLocked },
      select: { isLocked: true },
    });

    await logBusiness(
      req.user!.userId,
      req.user!.name,
      `${updated.isLocked ? 'Khoa' : 'Mo khoa'} tai khoan ${user.email}`,
      'Admin',
    );
    R.ok(
      res,
      { isLocked: updated.isLocked },
      `${updated.isLocked ? 'Khoa' : 'Mo khoa'} tai khoan thanh cong.`,
    );
  } catch (err) {
    R.badRequest(res, (err as Error).message);
  }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, is_deleted: false } });
    if (!user) {
      R.notFound(res, 'Nguoi dung khong ton tai.');
      return;
    }
    if (req.params.id === req.user!.userId) {
      R.badRequest(res, 'Khong the xoa chinh minh.');
      return;
    }

    await prisma.user.update({ where: { id: req.params.id }, data: { is_deleted: true } });
    await logBusiness(req.user!.userId, req.user!.name, 'DELETE', 'Admin', JSON.stringify({ old_values: user }));
    R.ok(res, null, 'Da xoa tai khoan.');
  } catch (err) {
    R.badRequest(res, (err as Error).message);
  }
});

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const categories = await prisma.category.findMany({
      where: { ...(type ? { type } : {}), isActive: true },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    R.ok(res, categories);
  } catch (err) {
    R.serverError(res, (err as Error).message);
  }
});

router.post('/categories', async (req: Request, res: Response) => {
  try {
    const payload = CategoryCreateSchema.parse(req.body);
    const cat = await prisma.category.create({
      data: {
        type: payload.type,
        value: payload.value,
        label: payload.label,
        sortOrder: payload.sortOrder ?? 0,
        isActive: true,
      },
    });
    await logBusiness(req.user!.userId, req.user!.name, `Tao danh muc ${cat.type}:${cat.value}`, 'Admin');
    R.created(res, cat, 'Tao danh muc thanh cong.');
  } catch (err) {
    R.badRequest(res, (err as Error).message);
  }
});

router.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const payload = CategoryUpdateSchema.parse(req.body);
    const cat = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        ...(payload.value !== undefined ? { value: payload.value } : {}),
        ...(payload.label !== undefined ? { label: payload.label } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
      },
    });
    await logBusiness(req.user!.userId, req.user!.name, `Cap nhat danh muc ${cat.type}:${cat.value}`, 'Admin');
    R.ok(res, cat, 'Cap nhat danh muc thanh cong.');
  } catch (err) {
    R.badRequest(res, (err as Error).message);
  }
});

router.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    const cat = await prisma.category.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    await logBusiness(req.user!.userId, req.user!.name, `An danh muc ${cat.type}:${cat.value}`, 'Admin');
    R.ok(res, null, 'Da an danh muc.');
  } catch (err) {
    R.badRequest(res, (err as Error).message);
  }
});

router.get('/config', async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
    R.ok(res, configs);
  } catch (err) {
    R.serverError(res, (err as Error).message);
  }
});

router.put('/config', async (req: Request, res: Response) => {
  try {
    const updates = z.array(ConfigItemSchema).parse(req.body);
    if (!Array.isArray(updates)) {
      R.badRequest(res, 'Body phai la mang [{ key, value, label? }].');
      return;
    }

    await Promise.all(
      updates.map(({ key, value, label }) =>
        prisma.systemConfig.upsert({
          where: { key },
          create: { key, value, label },
          update: { value, ...(label !== undefined ? { label } : {}) },
        }),
      ),
    );

    await logBusiness(req.user!.userId, req.user!.name, 'Cap nhat cau hinh he thong', 'Admin');
    R.ok(res, null, 'Cap nhat cau hinh thanh cong.');
  } catch (err) {
    R.badRequest(res, (err as Error).message);
  }
});

router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { module, user: userName, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit as string, 10) || 50, 1);

    const where: Record<string, unknown> = {};
    if (module) where.module = module;
    if (userName) where.userName = { contains: userName };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    R.ok(res, logs, undefined, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    R.serverError(res, (err as Error).message);
  }
});

export default router;
