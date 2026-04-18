import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { CouncilService } from '../councils/council.service';
import * as R from '../../utils/apiResponse';

const router = Router();
router.use(authenticate);

// PUT /api/revisions/:id/approve
// `id` here maps to councilId for final revision approval flow
router.put('/:id/approve',
  requireRole('council_member', 'research_staff', 'superadmin'),
  async (req: Request, res: Response) => {
    try {
      const result = await CouncilService.complete(
        req.params.id,
        req.user!.userId,
        req.user!.name,
        req.user!.role,
      );
      R.ok(res, result, 'Đã phê duyệt bản sửa cuối.');
    } catch (err) { R.badRequest(res, (err as Error).message); }
  }
);

export default router;
