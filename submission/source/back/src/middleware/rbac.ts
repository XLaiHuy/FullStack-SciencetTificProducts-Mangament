import { Request, Response, NextFunction } from 'express';
import * as R from '../utils/apiResponse';

type Role =
  | 'research_staff'
  | 'project_owner'
  | 'council_member'
  | 'accounting'
  | 'archive_staff'
  | 'report_viewer'
  | 'superadmin';

/**
 * Role-Based Access Control Middleware
 * Usage: requireRole('research_staff', 'superadmin')
 */
export const requireRole = (...allowedRoles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      R.unauthorized(res, 'Chưa xác thực.');
      return;
    }

    if (!allowedRoles.includes(user.role as Role)) {
      R.forbidden(res, `Vai trò "${user.role}" không có quyền truy cập tài nguyên này.`);
      return;
    }

    next();
  };

/**
 * Ensure user can only access their own resources
 * OR is superadmin/research_staff
 */
export const requireOwnerOrStaff = (getOwnerId: (req: Request) => string | undefined) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) { R.unauthorized(res); return; }

    const ownerId = getOwnerId(req);
    const isAdmin = ['superadmin', 'research_staff'].includes(user.role);
    const isOwner = ownerId === user.userId;

    if (!isAdmin && !isOwner) {
      R.forbidden(res, 'Bạn chỉ có thể thao tác trên tài nguyên của chính mình.');
      return;
    }
    next();
  };
