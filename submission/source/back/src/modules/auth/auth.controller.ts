import { Request, Response } from 'express';
import {
  AuthService,
  LoginSchema,
  RefreshSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from './auth.service';
import * as R from '../../utils/apiResponse';

export const AuthController = {
  async login(req: Request, res: Response) {
    try {
      const body = LoginSchema.parse(req.body);
      const result = await AuthService.login(body.email, body.password);
      R.ok(res, result, 'Dang nhap thanh cong.');
    } catch (err) {
      R.badRequest(res, (err as Error).message);
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        R.badRequest(res, 'refreshToken la bat buoc.');
        return;
      }
      await AuthService.logout(refreshToken, req.user!.name, req.user!.userId);
      R.ok(res, null, 'Dang xuat thanh cong.');
    } catch (err) {
      R.serverError(res, (err as Error).message);
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const body = RefreshSchema.parse(req.body);
      const result = await AuthService.refresh(body.refreshToken);
      R.ok(res, result, 'Token duoc lam moi thanh cong.');
    } catch (err) {
      R.unauthorized(res, (err as Error).message);
    }
  },

  async forgotPassword(req: Request, res: Response) {
    try {
      const body = ForgotPasswordSchema.parse(req.body);
      await AuthService.forgotPassword(body.email);
      R.ok(res, { accepted: true }, 'Neu email ton tai, huong dan dat lai mat khau da duoc gui.');
    } catch (err) {
      R.badRequest(res, (err as Error).message);
    }
  },

  async resetPassword(req: Request, res: Response) {
    try {
      const body = ResetPasswordSchema.parse(req.body);
      await AuthService.resetPassword(body.token, body.newPassword);
      R.ok(res, null, 'Dat lai mat khau thanh cong. Vui long dang nhap lai.');
    } catch (err) {
      R.badRequest(res, (err as Error).message);
    }
  },

  async getMe(req: Request, res: Response) {
    try {
      const user = await AuthService.getMe(req.user!.userId);
      R.ok(res, user);
    } catch (err) {
      R.notFound(res, (err as Error).message);
    }
  },

  async changePassword(req: Request, res: Response) {
    try {
      const body = ChangePasswordSchema.parse(req.body);
      await AuthService.changePassword(req.user!.userId, body.currentPassword, body.newPassword);
      R.ok(res, null, 'Doi mat khau thanh cong. Vui long dang nhap lai.');
    } catch (err) {
      R.badRequest(res, (err as Error).message);
    }
  },
};
