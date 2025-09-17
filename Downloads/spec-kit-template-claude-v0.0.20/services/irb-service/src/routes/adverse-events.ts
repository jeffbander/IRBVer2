import { Router } from 'express';
import { AdverseEventsController } from '../controllers/adverse-events.controller';
import { AdverseEventService } from '../services/adverse-event.service';
import { AdverseEventWorkflow } from '../workflows/adverse-event-workflow';
import { getNotificationService } from '../notifications';
import { requireRole, requirePermission } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Initialize services
const adverseEventService = new AdverseEventService();
const adverseEventWorkflow = new AdverseEventWorkflow(
  adverseEventService,
  getNotificationService()
);
const adverseEventsController = new AdverseEventsController(
  adverseEventService,
  adverseEventWorkflow
);

// Validation schemas
const createAdverseEventSchema = z.object({
  studyId: z.string().uuid(),
  participantId: z.string().uuid().optional(),
  externalId: z.string().min(1),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']),
  seriousness: z.enum(['NON_SERIOUS', 'SERIOUS']),
  expectedness: z.enum(['EXPECTED', 'UNEXPECTED']),
  relatedness: z.enum(['UNRELATED', 'UNLIKELY', 'POSSIBLE', 'PROBABLE', 'DEFINITE']),
  description: z.string().min(10),
  onsetDate: z.string().datetime(),
  resolutionDate: z.string().datetime().optional(),
  outcome: z.enum(['RECOVERED', 'RECOVERING', 'NOT_RECOVERED', 'RECOVERED_WITH_SEQUELAE', 'FATAL', 'UNKNOWN']),
  medicallySignificant: z.boolean().optional(),
  actionTaken: z.string().optional(),
  concomitantMedications: z.string().optional(),
  medicalHistory: z.string().optional()
});

const updateAdverseEventSchema = z.object({
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']).optional(),
  seriousness: z.enum(['NON_SERIOUS', 'SERIOUS']).optional(),
  expectedness: z.enum(['EXPECTED', 'UNEXPECTED']).optional(),
  relatedness: z.enum(['UNRELATED', 'UNLIKELY', 'POSSIBLE', 'PROBABLE', 'DEFINITE']).optional(),
  description: z.string().min(10).optional(),
  onsetDate: z.string().datetime().optional(),
  resolutionDate: z.string().datetime().optional(),
  outcome: z.enum(['RECOVERED', 'RECOVERING', 'NOT_RECOVERED', 'RECOVERED_WITH_SEQUELAE', 'FATAL', 'UNKNOWN']).optional(),
  medicallySignificant: z.boolean().optional(),
  actionTaken: z.string().optional(),
  concomitantMedications: z.string().optional(),
  medicalHistory: z.string().optional()
});

const addFollowUpSchema = z.object({
  documentId: z.string().uuid(),
  description: z.string().optional()
});

const addHospitalizationSchema = z.object({
  admissionDate: z.string().datetime(),
  dischargeDate: z.string().datetime().optional(),
  reason: z.string().min(1),
  hospital: z.string().min(1)
});

// Routes

// POST /api/adverse-events - Create new adverse event
router.post(
  '/',
  requireRole(['PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR', 'ADMIN']),
  validateRequest(createAdverseEventSchema),
  adverseEventsController.createAdverseEvent
);

// GET /api/adverse-events/:id - Get specific adverse event
router.get(
  '/:id',
  adverseEventsController.getAdverseEvent
);

// PUT /api/adverse-events/:id - Update adverse event
router.put(
  '/:id',
  validateRequest(updateAdverseEventSchema),
  adverseEventsController.updateAdverseEvent
);

// POST /api/adverse-events/:id/submit - Submit adverse event for reporting
router.post(
  '/:id/submit',
  requireRole(['PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR', 'ADMIN']),
  adverseEventsController.submitAdverseEvent
);

// POST /api/adverse-events/:id/follow-up - Add follow-up report
router.post(
  '/:id/follow-up',
  requireRole(['PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR', 'ADMIN']),
  validateRequest(addFollowUpSchema),
  adverseEventsController.addFollowUpReport
);

// POST /api/adverse-events/:id/hospitalization - Add hospitalization
router.post(
  '/:id/hospitalization',
  requireRole(['PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR', 'ADMIN']),
  validateRequest(addHospitalizationSchema),
  adverseEventsController.addHospitalization
);

// GET /api/adverse-events/studies/:studyId - Get adverse events by study
router.get(
  '/studies/:studyId',
  adverseEventsController.getAdverseEventsByStudy
);

// GET /api/adverse-events/studies/:studyId/dashboard - Get SAE dashboard
router.get(
  '/studies/:studyId/dashboard',
  requireRole(['PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR', 'ADMIN', 'MONITOR']),
  adverseEventsController.getSAEDashboard
);

// GET /api/adverse-events/studies/:studyId/statistics - Get adverse event statistics
router.get(
  '/studies/:studyId/statistics',
  requireRole(['PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR', 'ADMIN', 'MONITOR']),
  adverseEventsController.getStatistics
);

// Administrative routes

// GET /api/adverse-events/admin/all - Get all adverse events (admin only)
router.get(
  '/admin/all',
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const {
        severity,
        seriousness,
        status,
        isSAE,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        severity: severity as string,
        seriousness: seriousness as string,
        status: status as string,
        isSAE: isSAE === 'true',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      };

      const result = await adverseEventService.getAllAdverseEvents(
        filters,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve adverse events' });
    }
  }
);

// GET /api/adverse-events/admin/sae-summary - Get SAE summary across all studies
router.get(
  '/admin/sae-summary',
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const { timeframe = '30' } = req.query;

      const summary = await adverseEventService.getSAESummary(
        parseInt(timeframe as string)
      );

      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve SAE summary' });
    }
  }
);

// GET /api/adverse-events/admin/overdue-reports - Get overdue SAE reports
router.get(
  '/admin/overdue-reports',
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const overdueReports = await adverseEventService.getOverdueReports();
      res.json(overdueReports);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve overdue reports' });
    }
  }
);

// POST /api/adverse-events/:id/assess-expedited - Assess expedited reporting requirements
router.post(
  '/:id/assess-expedited',
  requireRole(['ADMIN', 'PRINCIPAL_INVESTIGATOR']),
  async (req, res) => {
    try {
      const { id } = req.params;

      const assessment = await adverseEventWorkflow.assessExpeditedReporting(id);

      res.json(assessment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to assess expedited reporting' });
    }
  }
);

// GET /api/adverse-events/regulatory/pending - Get pending regulatory reports
router.get(
  '/regulatory/pending',
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const pendingReports = await adverseEventService.getPendingRegulatoryReports();
      res.json(pendingReports);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve pending regulatory reports' });
    }
  }
);

// POST /api/adverse-events/bulk-import - Bulk import adverse events (admin only)
router.post(
  '/bulk-import',
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const { adverseEvents } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(adverseEvents)) {
        res.status(400).json({ error: 'adverseEvents must be an array' });
        return;
      }

      const results = await adverseEventService.bulkImport(adverseEvents, userId);

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to bulk import adverse events' });
    }
  }
);

export default router;