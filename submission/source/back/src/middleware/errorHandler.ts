import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as R from '../utils/apiResponse';

/**
 * Global Express Error Handler
 * Must be registered LAST in Express middleware chain:  app.use(errorHandler)
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error]', err);

  // Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    R.badRequest(res, `Dữ liệu không hợp lệ: ${messages}`);
    return;
  }

  // Prisma known request errors
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const prismaErr = err as { code: string; meta?: { target?: string[] } };

    if (prismaErr.code === 'P2002') {
      const field = prismaErr.meta?.target?.join(', ') ?? 'field';
      R.conflict(res, `Giá trị đã tồn tại: ${field}`);
      return;
    }

    if (prismaErr.code === 'P2025') {
      R.notFound(res, 'Bản ghi không tồn tại.');
      return;
    }
  }

  // Generic error
  if (err instanceof Error) {
    R.serverError(res, err.message);
    return;
  }

  R.serverError(res);
};
