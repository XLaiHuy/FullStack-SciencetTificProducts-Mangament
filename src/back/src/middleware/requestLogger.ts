import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

/**
 * Request Logger Middleware
 * Automatically logs all state-mutating requests (POST, PUT, PATCH, DELETE)
 * to the audit_logs table.
 */
export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (mutating.includes(req.method) && req.user) {
    const action = `${req.method} ${req.path}`;
    const module  = req.path.split('/')[3] ?? 'unknown';  // /api/v1/projects → projects

    prisma.auditLog.create({
      data: {
        userId:    req.user.userId,
        userName:  req.user.name,
        action,
        module,
        ipAddress: req.ip ?? 'unknown',
        details:   JSON.stringify(req.body).substring(0, 500),
      },
    }).catch(err => console.error('[AuditLog error]', err));
  }

  next();
};

/**
 * Manual audit logger for specific business events.
 * Call this in service layer for meaningful log entries.
 */
export const logBusiness = async (
  userId: string | null,
  userName: string,
  action: string,
  module: string,
  details?: string
): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      userId:   userId ?? undefined,
      userName,
      action,
      module,
      details,
    },
  }).catch(err => console.error('[AuditLog error]', err));
};

export const logDeleteAction = async (
  userId: string | null,
  userName: string,
  module: string,
  oldValues: unknown
): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      userName,
      action: 'DELETE',
      module,
      details: JSON.stringify({ old_values: oldValues }),
    },
  }).catch(err => console.error('[AuditLog error]', err));
};
