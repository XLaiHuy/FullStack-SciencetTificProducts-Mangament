import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import * as R from '../../utils/apiResponse';
import { NotificationService } from './notification.service';

const router = Router();
router.use(authenticate);

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = ListQuerySchema.parse(req.query);
    const userId = req.user!.userId;

    const { items, meta } = await NotificationService.listByUser(userId, page, limit);
    R.ok(res, items, undefined, meta);
  } catch (err) {
    R.badRequest(res, (err as Error).message);
  }
});

router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const unread = await NotificationService.unreadCount(userId);
    R.ok(res, { unread });
  } catch (err) {
    R.serverError(res, (err as Error).message);
  }
});

router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const updated = await NotificationService.markRead(req.params.id, userId);
    R.ok(res, updated, 'Da danh dau da doc.');
  } catch (err) {
    R.badRequest(res, (err as Error).message);
  }
});

router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const affected = await NotificationService.markAllRead(userId);
    R.ok(res, { affected }, 'Da danh dau tat ca da doc.');
  } catch (err) {
    R.serverError(res, (err as Error).message);
  }
});

export default router;
