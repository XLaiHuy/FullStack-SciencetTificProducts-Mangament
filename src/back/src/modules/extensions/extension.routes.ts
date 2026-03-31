import { Router } from 'express';
import { ExtensionController } from './extension.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import multer from 'multer';
import path from 'path';

const router = Router();
router.use(authenticate);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'extensions')),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/',
  requireRole('project_owner', 'research_staff', 'superadmin'),
  ExtensionController.getAll
);
router.get('/:id',
  requireRole('project_owner', 'research_staff', 'superadmin'),
  ExtensionController.getById
);

router.post('/',
  requireRole('project_owner'),
  upload.single('supporting_document'),
  ExtensionController.create
);

router.put('/:id/decision',
  requireRole('research_staff', 'superadmin'),
  ExtensionController.decide
);

// Standardized endpoint alias
router.put('/:id/approve',
  requireRole('research_staff', 'superadmin'),
  ExtensionController.approve
);

export default router;
