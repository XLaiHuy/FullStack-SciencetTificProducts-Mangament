import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractBearerToken, JwtPayload } from '../utils/jwt';
import * as R from '../utils/apiResponse';

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
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    R.unauthorized(res, 'Vui lòng đăng nhập để tiếp tục.');
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    R.unauthorized(res, 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
  }
};
