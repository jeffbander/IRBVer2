import { Router } from 'express';
import { IRBSubmissionController } from '../controllers/irb-submission.controller';
import { IRBSubmissionService } from '../services/irb-submission.service';
import { IRBReviewService } from '../services/irb-review.service';
import { IRBWorkflowService } from '../workflows/irb-workflow';
import { getNotificationService } from '../notifications';
import { requireRole, requirePermission } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Initialize services
const irbSubmissionService = new IRBSubmissionService();
const irbReviewService = new IRBReviewService();
const irbWorkflowService = new IRBWorkflowService(
  irbSubmissionService,
  irbReviewService,
  getNotificationService()
);
const irbSubmissionController = new IRBSubmissionController(
  irbSubmissionService,
  irbWorkflowService
);

// Validation schemas
const createSubmissionSchema = z.object({
  studyId: z.string().uuid(),
  submissionType: z.enum(['INITIAL', 'AMENDMENT', 'CONTINUING_REVIEW', 'REPORTABLE_EVENT', 'STUDY_CLOSURE', 'EMERGENCY_USE']),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  reviewType: z.enum(['FULL_BOARD', 'EXPEDITED', 'EXEMPT', 'NOT_HUMAN_SUBJECTS']),
  expeditedCategory: z.array(z.string()).optional()
});

const updateSubmissionSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  reviewType: z.enum(['FULL_BOARD', 'EXPEDITED', 'EXEMPT', 'NOT_HUMAN_SUBJECTS']).optional(),
  expeditedCategory: z.array(z.string()).optional(),
  documentIds: z.array(z.string().uuid()).optional()
});

const assignReviewersSchema = z.object({
  reviewers: z.array(z.string().uuid()).min(1),
  primaryReviewerId: z.string().uuid().optional(),
  secondaryReviewerId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional()
});

const makeDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'APPROVED_WITH_CONDITIONS', 'DISAPPROVED', 'DEFERRED', 'TABLED', 'REQUIRES_MODIFICATIONS']),
  conditions: z.array(z.string()).optional(),
  modifications: z.array(z.string()).optional(),
  approvalExpirationDate: z.string().datetime().optional()
});

const withdrawSubmissionSchema = z.object({
  reason: z.string().min(1)
});

// Routes

// GET /api/irb/dashboard - Get dashboard data
router.get('/dashboard', irbSubmissionController.getDashboard);

// POST /api/irb/submissions - Create new IRB submission
router.post(
  '/submissions',
  requireRole(['PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR', 'ADMIN']),
  validateRequest(createSubmissionSchema),
  irbSubmissionController.createSubmission
);

// GET /api/irb/submissions/:id - Get specific submission
router.get(
  '/submissions/:id',
  irbSubmissionController.getSubmission
);

// PUT /api/irb/submissions/:id - Update submission
router.put(
  '/submissions/:id',
  validateRequest(updateSubmissionSchema),
  irbSubmissionController.updateSubmission
);

// POST /api/irb/submissions/:id/submit - Submit for review
router.post(
  '/submissions/:id/submit',
  requireRole(['PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR', 'ADMIN']),
  irbSubmissionController.submitForReview
);

// POST /api/irb/submissions/:id/assign-reviewers - Assign reviewers
router.post(
  '/submissions/:id/assign-reviewers',
  requireRole(['ADMIN']),
  validateRequest(assignReviewersSchema),
  irbSubmissionController.assignReviewers
);

// POST /api/irb/submissions/:id/decision - Make IRB decision
router.post(
  '/submissions/:id/decision',
  requireRole(['ADMIN']),
  validateRequest(makeDecisionSchema),
  irbSubmissionController.makeDecision
);

// POST /api/irb/submissions/:id/withdraw - Withdraw submission
router.post(
  '/submissions/:id/withdraw',
  validateRequest(withdrawSubmissionSchema),
  irbSubmissionController.withdrawSubmission
);

// GET /api/irb/studies/:studyId/submissions - Get submissions by study
router.get(
  '/studies/:studyId/submissions',
  irbSubmissionController.getSubmissionsByStudy
);

// Review-specific routes
// GET /api/irb/reviews/my-reviews - Get reviews assigned to current user
router.get('/reviews/my-reviews', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { status, page = 1, limit = 10 } = req.query;

    const reviews = await irbReviewService.getReviewsByReviewer(
      userId,
      status as string,
      {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }
    );

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve reviews' });
  }
});

// GET /api/irb/reviews/:id - Get specific review
router.get('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const review = await irbReviewService.getReviewById(id);

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve review' });
  }
});

// PUT /api/irb/reviews/:id - Update review
router.put('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const updateData = req.body;

    // Verify reviewer authorization
    const existingReview = await irbReviewService.getReviewById(id);
    if (!existingReview) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    if (existingReview.reviewerId !== userId && !['ADMIN'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Not authorized to update this review' });
      return;
    }

    const updatedReview = await irbReviewService.updateReview(id, updateData);
    res.json(updatedReview);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// POST /api/irb/reviews/:id/submit - Submit review
router.post('/reviews/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const review = await irbReviewService.getReviewById(id);
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    if (review.reviewerId !== userId && !['ADMIN'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Not authorized to submit this review' });
      return;
    }

    const updatedReview = await irbReviewService.submitReview(id);
    res.json(updatedReview);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Administrative routes

// GET /api/irb/admin/submissions - Get all submissions (admin only)
router.get(
  '/admin/submissions',
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const { status, submissionType, page = 1, limit = 20 } = req.query;

      const filters = {
        status: status as string,
        submissionType: submissionType as string
      };

      const submissions = await irbSubmissionService.getAllSubmissions(
        filters,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve submissions' });
    }
  }
);

// GET /api/irb/admin/metrics - Get IRB metrics and statistics
router.get(
  '/admin/metrics',
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const metrics = await irbSubmissionService.getMetrics({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  }
);

export default router;