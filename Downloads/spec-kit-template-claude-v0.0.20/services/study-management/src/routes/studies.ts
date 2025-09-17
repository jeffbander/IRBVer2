import { Router } from 'express';
import { UserRole } from '@research-study/shared';
import { StudyController } from '../controllers/studyController';
import {
  authenticate,
  authorize,
  authorizeStudyAccess,
  rateLimitByUser,
  auditMiddleware
} from '../middleware/auth';

const router = Router();

// Apply authentication and audit logging to all routes
router.use(authenticate);
router.use(auditMiddleware);

/**
 * GET /api/v1/studies
 * List studies with filtering and pagination
 * Available to all authenticated users
 */
router.get(
  '/',
  rateLimitByUser(100, 60000), // 100 requests per minute
  StudyController.list
);

/**
 * POST /api/v1/studies
 * Create a new study
 * Only PIs and Admins can create studies
 */
router.post(
  '/',
  authorize(UserRole.PRINCIPAL_INVESTIGATOR, UserRole.ADMIN),
  rateLimitByUser(10, 60000), // 10 studies per minute
  StudyController.create
);

/**
 * GET /api/v1/studies/pi/:piId
 * Get studies by principal investigator
 * Available to all authenticated users
 */
router.get(
  '/pi/:piId',
  rateLimitByUser(50, 60000), // 50 requests per minute
  StudyController.getByPI
);

/**
 * GET /api/v1/studies/:id
 * Get study by ID with full details
 * Requires study access authorization
 */
router.get(
  '/:id',
  authorizeStudyAccess,
  StudyController.getById
);

/**
 * PATCH /api/v1/studies/:id
 * Update study
 * Only PIs of the study, study coordinators, and admins can update
 */
router.patch(
  '/:id',
  authorizeStudyAccess,
  authorize(
    UserRole.PRINCIPAL_INVESTIGATOR,
    UserRole.STUDY_COORDINATOR,
    UserRole.ADMIN
  ),
  rateLimitByUser(20, 60000), // 20 updates per minute
  StudyController.update
);

/**
 * DELETE /api/v1/studies/:id
 * Delete (terminate) study
 * Only PIs of the study and admins can delete
 */
router.delete(
  '/:id',
  authorizeStudyAccess,
  authorize(UserRole.PRINCIPAL_INVESTIGATOR, UserRole.ADMIN),
  rateLimitByUser(5, 60000), // 5 deletions per minute
  StudyController.delete
);

/**
 * PUT /api/v1/studies/:id/status
 * Update study status
 * Specific authorization based on status transition
 */
router.put(
  '/:id/status',
  authorizeStudyAccess,
  authorize(
    UserRole.PRINCIPAL_INVESTIGATOR,
    UserRole.STUDY_COORDINATOR,
    UserRole.ADMIN
  ),
  rateLimitByUser(10, 60000), // 10 status updates per minute
  StudyController.updateStatus
);

/**
 * POST /api/v1/studies/:id/submit-irb
 * Submit study to IRB for review
 * Only PIs and study coordinators can submit
 */
router.post(
  '/:id/submit-irb',
  authorizeStudyAccess,
  authorize(
    UserRole.PRINCIPAL_INVESTIGATOR,
    UserRole.STUDY_COORDINATOR,
    UserRole.ADMIN
  ),
  rateLimitByUser(5, 60000), // 5 submissions per minute
  StudyController.submitToIRB
);

/**
 * GET /api/v1/studies/:id/statistics
 * Get study statistics
 * Requires study access authorization
 */
router.get(
  '/:id/statistics',
  authorizeStudyAccess,
  StudyController.getStatistics
);

/**
 * GET /api/v1/studies/:id/irb-submissions
 * Get IRB submissions for a study
 * Requires study access authorization
 */
router.get(
  '/:id/irb-submissions',
  authorizeStudyAccess,
  StudyController.getIRBSubmissions
);

// Participants routes (nested under studies)
/**
 * GET /api/v1/studies/:id/participants
 * List participants in a study
 * Requires study access authorization
 */
router.get(
  '/:id/participants',
  authorizeStudyAccess,
  async (req, res, next) => {
    // Import ParticipantController dynamically to avoid circular dependency
    const { ParticipantController } = await import('../controllers/participantController');
    ParticipantController.listByStudy(req, res).catch(next);
  }
);

/**
 * POST /api/v1/studies/:id/participants
 * Create a new participant in a study
 * Only study coordinators, PIs, and admins can create participants
 */
router.post(
  '/:id/participants',
  authorizeStudyAccess,
  authorize(
    UserRole.PRINCIPAL_INVESTIGATOR,
    UserRole.STUDY_COORDINATOR,
    UserRole.SITE_COORDINATOR,
    UserRole.ADMIN
  ),
  rateLimitByUser(20, 60000), // 20 participants per minute
  async (req, res, next) => {
    const { ParticipantController } = await import('../controllers/participantController');
    ParticipantController.create(req, res).catch(next);
  }
);

// Team assignments routes (nested under studies)
/**
 * GET /api/v1/studies/:id/team
 * Get study team assignments
 * Requires study access authorization
 */
router.get(
  '/:id/team',
  authorizeStudyAccess,
  async (req, res, next) => {
    const { StudyAssignmentController } = await import('../controllers/studyAssignmentController');
    StudyAssignmentController.listByStudy(req, res).catch(next);
  }
);

/**
 * POST /api/v1/studies/:id/team
 * Add team member to study
 * Only PIs and admins can manage team assignments
 */
router.post(
  '/:id/team',
  authorizeStudyAccess,
  authorize(UserRole.PRINCIPAL_INVESTIGATOR, UserRole.ADMIN),
  rateLimitByUser(10, 60000), // 10 assignments per minute
  async (req, res, next) => {
    const { StudyAssignmentController } = await import('../controllers/studyAssignmentController');
    StudyAssignmentController.create(req, res).catch(next);
  }
);

/**
 * PATCH /api/v1/studies/:id/team/:assignmentId
 * Update team assignment
 * Only PIs and admins can modify assignments
 */
router.patch(
  '/:id/team/:assignmentId',
  authorizeStudyAccess,
  authorize(UserRole.PRINCIPAL_INVESTIGATOR, UserRole.ADMIN),
  async (req, res, next) => {
    const { StudyAssignmentController } = await import('../controllers/studyAssignmentController');
    StudyAssignmentController.update(req, res).catch(next);
  }
);

/**
 * DELETE /api/v1/studies/:id/team/:assignmentId
 * Remove team member from study
 * Only PIs and admins can remove assignments
 */
router.delete(
  '/:id/team/:assignmentId',
  authorizeStudyAccess,
  authorize(UserRole.PRINCIPAL_INVESTIGATOR, UserRole.ADMIN),
  async (req, res, next) => {
    const { StudyAssignmentController } = await import('../controllers/studyAssignmentController');
    StudyAssignmentController.delete(req, res).catch(next);
  }
);

// Documents routes (nested under studies)
/**
 * GET /api/v1/studies/:id/documents
 * List study documents
 * Requires study access authorization
 */
router.get(
  '/:id/documents',
  authorizeStudyAccess,
  async (req, res, next) => {
    // Placeholder for document controller
    res.json({ message: 'Document management not yet implemented' });
  }
);

/**
 * POST /api/v1/studies/:id/documents
 * Upload study document
 * Only study team members can upload documents
 */
router.post(
  '/:id/documents',
  authorizeStudyAccess,
  authorize(
    UserRole.PRINCIPAL_INVESTIGATOR,
    UserRole.STUDY_COORDINATOR,
    UserRole.REGULATORY_SPECIALIST,
    UserRole.ADMIN
  ),
  async (req, res, next) => {
    // Placeholder for document upload
    res.json({ message: 'Document upload not yet implemented' });
  }
);

export default router;