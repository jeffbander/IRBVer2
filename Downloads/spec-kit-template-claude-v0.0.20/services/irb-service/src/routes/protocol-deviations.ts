import { Router } from 'express';
import { ProtocolDeviationsController } from '../controllers/protocol-deviations.controller';
import { ProtocolDeviationService } from '../services/protocol-deviation.service';
import { ProtocolDeviationWorkflow } from '../workflows/protocol-deviation-workflow';
import { getNotificationService } from '../notifications';
import { requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Initialize services
const protocolDeviationService = new ProtocolDeviationService();
const protocolDeviationWorkflow = new ProtocolDeviationWorkflow(
  protocolDeviationService,
  getNotificationService()
);
const protocolDeviationsController = new ProtocolDeviationsController(
  protocolDeviationService,
  protocolDeviationWorkflow
);

// Validation schemas
const createDeviationSchema = z.object({
  studyId: z.string().uuid(),
  participantId: z.string().uuid().optional(),
  deviationType: z.enum(['INCLUSION_EXCLUSION', 'INFORMED_CONSENT', 'RANDOMIZATION', 'STUDY_PROCEDURE', 'CONCOMITANT_MEDICATION', 'VISIT_WINDOW', 'LABORATORY', 'DOSING', 'SAFETY_MONITORING', 'DATA_COLLECTION', 'OTHER']),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']),
  description: z.string().min(10),
  protocolSection: z.string().min(1),
  dateOccurred: z.string().datetime(),
  dateDiscovered: z.string().datetime(),
  impactOnDataIntegrity: z.boolean().optional(),
  impactOnParticipantSafety: z.boolean().optional(),
  impactOnStudyValidity: z.boolean().optional(),
  correctiveAction: z.string().optional(),
  preventiveAction: z.string().optional()
});

// Routes
router.post('/', requireRole(['PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR', 'ADMIN']), validateRequest(createDeviationSchema), protocolDeviationsController.createProtocolDeviation);
router.get('/:id', protocolDeviationsController.getProtocolDeviation);
router.put('/:id', protocolDeviationsController.updateProtocolDeviation);
router.post('/:id/corrective-action', requireRole(['PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR', 'ADMIN']), protocolDeviationsController.addCorrectiveAction);
router.post('/:id/close', requireRole(['ADMIN', 'PRINCIPAL_INVESTIGATOR']), protocolDeviationsController.closeProtocolDeviation);
router.get('/studies/:studyId', protocolDeviationsController.getProtocolDeviationsByStudy);
router.get('/studies/:studyId/dashboard', protocolDeviationsController.getDeviationDashboard);
router.get('/studies/:studyId/statistics', protocolDeviationsController.getStatistics);

export default router;