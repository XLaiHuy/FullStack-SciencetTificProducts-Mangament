import { z } from 'zod';
import prisma from '../../prisma';
import { verifyPassword, hashPassword } from '../../utils/password';
import { signToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { logBusiness } from '../../middleware/requestLogger';

// ─── Validation Schemas ───────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email:    z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(6, 'Mật khẩu mới phải tối thiểu 6 ký tự'),
});

// ─── Auth Service ─────────────────────────────────────────────────────────────
export const AuthService = {
  /**
   * POST /api/auth/login
   * Verify credentials → issue JWT access + refresh tokens
   */
  async login(email: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { email, is_deleted: false },
    });

    if (!user) throw new Error('Email hoặc mật khẩu không đúng.');
    if (user.isLocked) throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
    if (!user.isActive) throw new Error('Tài khoản chưa được kích hoạt.');

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new Error('Email hoặc mật khẩu không đúng.');

    const payload = {
      userId:      user.id,
      email:       user.email,
      role:        user.role,
      councilRole: user.councilRole ?? undefined,
      name:        user.name,
    };

    const accessToken  = signToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Persist refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

    await logBusiness(user.id, user.name, 'Đăng nhập', 'Auth');

    return {
      accessToken,
      refreshToken,
      user: {
        id:          user.id,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        councilRole: user.councilRole,
        title:       user.title,
        department:  user.department,
        avatar:      user.avatar,
      },
    };
  },

  /**
   * POST /api/auth/logout
   * Invalidate the refresh token
   */
  async logout(refreshToken: string, userName: string, userId: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken, userId } });
    await logBusiness(userId, userName, 'Đăng xuất', 'Auth');
  },

  /**
   * POST /api/auth/refresh
   * Issue new access token using refresh token
   */
  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);

    const stored = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, userId: payload.userId, expiresAt: { gt: new Date() } },
    });
    if (!stored) throw new Error('Refresh token không hợp lệ hoặc đã hết hạn.');

    const user = await prisma.user.findFirst({ where: { id: payload.userId, is_deleted: false } });
    if (!user || user.isLocked || !user.isActive) throw new Error('Tài khoản không hợp lệ.');

    const newPayload = {
      userId:      user.id,
      email:       user.email,
      role:        user.role,
      councilRole: user.councilRole ?? undefined,
      name:        user.name,
    };

    return { accessToken: signToken(newPayload) };
  },

  /**
   * GET /api/auth/me
   * Return current user profile
   */
  async getMe(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, is_deleted: false },
      select: {
        id: true, name: true, email: true, role: true, councilRole: true,
        title: true, department: true, avatar: true, createdAt: true,
      },
    });
    if (!user) throw new Error('Người dùng không tồn tại.');
    return user;
  },

  /**
   * PUT /api/auth/change-password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, is_deleted: false } });
    if (!user) throw new Error('Người dùng không tồn tại.');

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new Error('Mật khẩu hiện tại không đúng.');

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await logBusiness(userId, user.name, 'Đổi mật khẩu', 'Auth');
  },
};
