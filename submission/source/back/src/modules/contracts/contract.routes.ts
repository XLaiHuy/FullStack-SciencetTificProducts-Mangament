import { Router } from 'express';
import { ContractController } from './contract.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import multer from 'multer';
import path from 'path';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'contracts')),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.use(authenticate);

router.post('/proposals/parse',
  requireRole('research_staff', 'superadmin'),
  upload.single('file'),
  ContractController.parseProposal
);

router.get('/',
  requireRole('research_staff', 'superadmin', 'project_owner', 'accounting', 'report_viewer'),
  ContractController.getAll
);
router.get('/my',  requireRole('project_owner'),   ContractController.getMyContracts);
router.get('/:id',
  requireRole('research_staff', 'superadmin', 'project_owner', 'accounting', 'report_viewer'),
  ContractController.getById
);
router.get('/:id/pdf',
  requireRole('research_staff', 'superadmin', 'project_owner', 'accounting', 'report_viewer'),
  ContractController.downloadPdf
);
router.get('/:id/export-excel',
  requireRole('research_staff', 'superadmin', 'project_owner', 'accounting', 'report_viewer'),
  ContractController.exportExcel
);

router.post('/',
  requireRole('research_staff', 'superadmin'),
  ContractController.create
);

router.post('/:id/sign',
  requireRole('project_owner'),
  ContractController.sign
);

router.post('/:id/upload',
  requireRole('research_staff', 'superadmin'),
  upload.single('file'),
  ContractController.uploadPdf
);

router.put('/:id/status',
  requireRole('research_staff', 'superadmin'),
  ContractController.updateStatus
);

router.delete('/:id',
  requireRole('research_staff', 'superadmin'),
  ContractController.delete
);

export default router;
