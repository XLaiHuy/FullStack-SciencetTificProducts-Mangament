import { Router } from 'express';
import { SettlementController } from './settlement.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/',     SettlementController.getAll);
router.get('/:id',  SettlementController.getById);
router.get('/:id/export', SettlementController.export);

router.post('/',
  requireRole('project_owner'),
  SettlementController.create
);

router.post('/:id/supplement-request',
  requireRole('research_staff', 'superadmin'),
  SettlementController.requestSupplement
);

router.put('/:id/status',
  requireRole('research_staff', 'accounting', 'superadmin'),
  SettlementController.updateStatus
);

// Standardized endpoint alias for liquidation approval
router.put('/:id/approve',
  requireRole('accounting', 'superadmin'),
  SettlementController.approve
);

export default router;
