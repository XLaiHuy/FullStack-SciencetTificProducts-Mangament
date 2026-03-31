import { Router } from 'express';
import { ProjectController } from './project.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import multer from 'multer';
import path from 'path';

const router = Router();

// Multer for product/report file upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'products')),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// All routes require authentication
router.use(authenticate);

// Dashboard
router.get('/dashboard', requireRole('research_staff', 'superadmin'), ProjectController.getDashboard);

// CRUD
router.get('/',
  requireRole('research_staff', 'superadmin', 'project_owner', 'accounting', 'archive_staff', 'report_viewer', 'council_member'),
  ProjectController.getAll
);
router.get('/my',
  requireRole('project_owner'),
  ProjectController.getMyProjects
);
router.get('/:id/reports/:reportId/download',
  requireRole('research_staff', 'superadmin', 'project_owner', 'accounting', 'archive_staff', 'report_viewer', 'council_member'),
  ProjectController.downloadReportFile
);
router.get('/:id',
  requireRole('research_staff', 'superadmin', 'project_owner', 'accounting', 'archive_staff', 'report_viewer', 'council_member'),
  ProjectController.getById
);

router.post('/',
  requireRole('research_staff', 'superadmin'),
  ProjectController.create
);

router.put('/:id',
  requireRole('research_staff', 'superadmin'),
  ProjectController.update
);

router.put('/:id/status',
  requireRole('research_staff', 'superadmin'),
  ProjectController.updateStatus
);

router.delete('/:id',
  requireRole('superadmin'),
  ProjectController.delete
);

// Project Owner actions
router.post('/:id/midterm-report',
  requireRole('project_owner'),
  upload.single('file'),
  ProjectController.submitMidtermReport
);

router.post('/:id/final-submission',
  requireRole('project_owner'),
  upload.single('file'),
  ProjectController.submitFinalReport
);

// Unified product/report endpoint
router.post('/:id/products',
  requireRole('project_owner'),
  upload.single('file'),
  ProjectController.submitProduct
);

export default router;
