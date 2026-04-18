import { Router } from 'express';
import { CouncilController, uploadDecision, uploadMemberFile } from './council.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/',
  requireRole('research_staff', 'superadmin', 'council_member', 'project_owner'),
  CouncilController.getAll
);
router.get('/mine', requireRole('council_member'), CouncilController.getMine);
router.get('/:id',
  requireRole('research_staff', 'superadmin', 'council_member', 'project_owner'),
  CouncilController.getById
);

router.post('/',
  requireRole('research_staff', 'superadmin'),
  CouncilController.create
);

router.post('/check-conflict',
  requireRole('research_staff', 'superadmin'),
  CouncilController.checkConflict
);

router.post('/parse-members',
  requireRole('research_staff', 'superadmin'),
  uploadMemberFile.single('file'),
  CouncilController.parseMembersFromFile
);

router.post('/:id/members',
  requireRole('research_staff', 'superadmin'),
  CouncilController.addMember
);

router.post('/:id/decision',
  requireRole('research_staff', 'superadmin'),
  uploadDecision.single('file'),
  CouncilController.uploadDecision
);

router.get('/:id/decision-file',
  requireRole('research_staff', 'superadmin', 'council_member', 'project_owner'),
  CouncilController.downloadDecision
);

router.get('/:id/minutes-file',
  requireRole('research_staff', 'superadmin', 'council_member', 'project_owner'),
  CouncilController.downloadMinutes
);

router.post('/:id/resend-invitations',
  requireRole('research_staff', 'superadmin'),
  CouncilController.resendInvitations
);

router.delete('/:id/members/:memberId',
  requireRole('research_staff', 'superadmin'),
  CouncilController.removeMember
);

router.put('/:id/approve',
  requireRole('research_staff', 'superadmin'),
  CouncilController.approve
);

router.put('/:id/complete',
  requireRole('research_staff', 'superadmin', 'council_member'),
  CouncilController.complete
);

router.post('/:id/review',
  requireRole('council_member'),
  CouncilController.submitReview
);

router.post('/:id/minutes',
  requireRole('council_member', 'research_staff', 'superadmin'),
  uploadDecision.single('file'),
  CouncilController.recordMinutes
);

router.post('/:id/score',
  requireRole('council_member'),
  CouncilController.submitScore
);

// Standardized aliases
router.post('/:id/score-reviews',
  requireRole('council_member'),
  CouncilController.submitScore
);
router.get('/:id/score-summary',
  requireRole('council_member', 'research_staff', 'superadmin', 'project_owner'),
  CouncilController.getScoreSummary
);
router.post('/:id/score-decisions',
  requireRole('council_member', 'research_staff', 'superadmin'),
  CouncilController.submitScoreDecision
);

export default router;
