import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { SettlementController } from './settlement.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

const uploadDir = path.join(process.cwd(), 'uploads', 'settlements');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
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
  upload.array('evidenceFiles', 10),
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
