import { z } from 'zod';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma';
import { verifyPassword, hashPassword } from '../../utils/password';
import { signToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { logBusiness } from '../../middleware/requestLogger';
import { sendEmail } from '../../utils/emailService';

export const LoginSchema = z.object({
  email: z.string().email('Email khong hop le'),
  password: z.string().min(1, 'Mat khau khong duoc de trong'),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Email khong hop le'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token la bat buoc'),
  newPassword: z.string().min(6, 'Mat khau moi phai toi thieu 6 ky tu'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Mat khau moi phai toi thieu 6 ky tu'),
});

const RESET_TOKEN_SECRET = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET || 'fallback_secret_change_in_prod';
const RESET_TOKEN_EXPIRES_IN = process.env.JWT_RESET_EXPIRES_IN || '15m';

type ResetTokenPayload = {
  userId: string;
  email: string;
  purpose: 'password_reset';
};

export const AuthService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { email, is_deleted: false },
    });

    if (!user) throw new Error('Email hoac mat khau khong dung.');
    if (user.isLocked) throw new Error('Tai khoan da bi khoa. Vui long lien he quan tri vien.');
    if (!user.isActive) throw new Error('Tai khoan chua duoc kich hoat.');

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new Error('Email hoac mat khau khong dung.');

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      councilRole: user.councilRole ?? undefined,
      name: user.name,
    };

    const accessToken = signToken(payload);
    const refreshToken = signRefreshToken(payload);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });
    await logBusiness(user.id, user.name, 'Dang nhap', 'Auth');

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        councilRole: user.councilRole,
        title: user.title,
        department: user.department,
        avatar: user.avatar,
        mustChangePassword: Boolean((user as { mustChangePassword?: boolean }).mustChangePassword),
      },
    };
  },

  async logout(refreshToken: string, userName: string, userId: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken, userId } });
    await logBusiness(userId, userName, 'Dang xuat', 'Auth');
  },

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);

    const stored = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, userId: payload.userId, expiresAt: { gt: new Date() } },
    });
    if (!stored) throw new Error('Refresh token khong hop le hoac da het han.');

    const user = await prisma.user.findFirst({ where: { id: payload.userId, is_deleted: false } });
    if (!user || user.isLocked || !user.isActive) throw new Error('Tai khoan khong hop le.');

    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      councilRole: user.councilRole ?? undefined,
      name: user.name,
    };

    return { accessToken: signToken(newPayload) };
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findFirst({
      where: { email, is_deleted: false, isLocked: false, isActive: true },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) return { accepted: true };
    if (user.role === 'council_member') {
      throw new Error('Thanh vien hoi dong vui long lien he quan tri vien de duoc cap lai mat khau.');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'password_reset' } satisfies ResetTokenPayload,
      RESET_TOKEN_SECRET,
      { expiresIn: RESET_TOKEN_EXPIRES_IN } as jwt.SignOptions,
    );

    const appOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${appOrigin}/reset-password?token=${encodeURIComponent(token)}`;

    await sendEmail({
      to: user.email,
      subject: '[NCKH] Huong dan dat lai mat khau',
      body: [
        `Kinh gui ${user.name},`,
        '',
        'He thong da nhan duoc yeu cau dat lai mat khau cua ban.',
        `Link dat lai mat khau (hieu luc ${RESET_TOKEN_EXPIRES_IN}):`,
        resetLink,
        '',
        'Neu ban khong thuc hien yeu cau nay, vui long bo qua email.',
      ].join('\n'),
    });

    await logBusiness(user.id, user.name, 'Yeu cau dat lai mat khau', 'Auth');
    return { accepted: true };
  },

  async resetPassword(token: string, newPassword: string) {
    let payload: ResetTokenPayload;
    try {
      payload = jwt.verify(token, RESET_TOKEN_SECRET) as ResetTokenPayload;
    } catch {
      throw new Error('Token dat lai mat khau khong hop le hoac da het han.');
    }

    if (!payload?.userId || payload.purpose !== 'password_reset') {
      throw new Error('Token dat lai mat khau khong hop le.');
    }

    const user = await prisma.user.findFirst({
      where: { id: payload.userId, email: payload.email, is_deleted: false },
      select: { id: true, name: true },
    });
    if (!user) throw new Error('Nguoi dung khong ton tai hoac da bi vo hieu hoa.');

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false as never },
    });

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await logBusiness(user.id, user.name, 'Dat lai mat khau', 'Auth');
  },

  async getMe(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, is_deleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        councilRole: true,
        title: true,
        department: true,
        avatar: true,
        createdAt: true,
        mustChangePassword: true as never,
      },
    });
    if (!user) throw new Error('Nguoi dung khong ton tai.');
    return user;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, is_deleted: false } });
    if (!user) throw new Error('Nguoi dung khong ton tai.');

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new Error('Mat khau hien tai khong dung.');

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, mustChangePassword: false as never },
    });

    await prisma.refreshToken.deleteMany({ where: { userId } });
    await logBusiness(userId, user.name, 'Doi mat khau', 'Auth');
  },
};
