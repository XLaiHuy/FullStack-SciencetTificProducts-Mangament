import { Router } from 'express';
import { SettlementController } from './settlement.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import multer from 'multer';
import path from 'path';

const router = Router();
router.use(authenticate);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'settlements')),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/',
  requireRole('project_owner', 'research_staff', 'accounting', 'superadmin', 'report_viewer'),
  SettlementController.getAll
);
router.get('/:id',
  requireRole('project_owner', 'research_staff', 'accounting', 'superadmin', 'report_viewer'),
  SettlementController.getById
);
router.get('/:id/export',
  requireRole('project_owner', 'research_staff', 'accounting', 'superadmin', 'report_viewer'),
  SettlementController.export
);

router.post('/',
  requireRole('project_owner'),
  upload.single('evidenceFile'),
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
