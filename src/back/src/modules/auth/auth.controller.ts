import { Request, Response } from 'express';
import { AuthService, LoginSchema, RefreshSchema, ChangePasswordSchema } from './auth.service';
import * as R from '../../utils/apiResponse';

export const AuthController = {
  /** POST /api/auth/login */
  async login(req: Request, res: Response) {
    try {
      const body = LoginSchema.parse(req.body);
      const result = await AuthService.login(body.email, body.password);
      R.ok(res, result, 'Đăng nhập thành công.');
    } catch (err) {
      R.badRequest(res, (err as Error).message);
    }
  },

  /** POST /api/auth/logout */
  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) { R.badRequest(res, 'refreshToken là bắt buộc.'); return; }
      await AuthService.logout(refreshToken, req.user!.name, req.user!.userId);
      R.ok(res, null, 'Đăng xuất thành công.');
    } catch (err) {
      R.serverError(res, (err as Error).message);
    }
  },

  /** POST /api/auth/refresh */
  async refresh(req: Request, res: Response) {
    try {
      const body = RefreshSchema.parse(req.body);
      const result = await AuthService.refresh(body.refreshToken);
      R.ok(res, result, 'Token được làm mới thành công.');
    } catch (err) {
      R.unauthorized(res, (err as Error).message);
    }
  },

  /** GET /api/auth/me */
  async getMe(req: Request, res: Response) {
    try {
      const user = await AuthService.getMe(req.user!.userId);
      R.ok(res, user);
    } catch (err) {
      R.notFound(res, (err as Error).message);
    }
  },

  /** PUT /api/auth/change-password */
  async changePassword(req: Request, res: Response) {
    try {
      const body = ChangePasswordSchema.parse(req.body);
      await AuthService.changePassword(req.user!.userId, body.currentPassword, body.newPassword);
      R.ok(res, null, 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
    } catch (err) {
      R.badRequest(res, (err as Error).message);
    }
  },
};
