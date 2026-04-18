import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractBearerToken, JwtPayload } from '../utils/jwt';
import * as R from '../utils/apiResponse';
import prisma from '../prisma';

// Extend Express Request to include user payload
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT Authentication Middleware
 * Validates Bearer token and attaches payload to req.user
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    R.unauthorized(res, 'Vui lòng đăng nhập để tiếp tục.');
    return;
  }

  try {
    const payload = verifyToken(token);

    const user = await prisma.user.findFirst({
      where: { id: payload.userId, is_deleted: false },
      select: { isActive: true, isLocked: true },
    });
    if (!user || user.isLocked || !user.isActive) {
      R.unauthorized(res, 'Tài khoản không hợp lệ hoặc đã bị khóa. Vui lòng đăng nhập lại.');
      return;
    }

    req.user = payload;
    next();
  } catch {
    R.unauthorized(res, 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
  }
};
