import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateParticipantRequestSchema,
  UpdateParticipantRequestSchema,
  ParticipantListQuerySchema,
} from '@research-study/shared';
import { requirePermission, requireStudyAccess, AuthenticatedRequest } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';

const router = Router();

// GET /participants - List participants with filtering and pagination
router.get('/',
  requirePermission('VIEW_PARTICIPANTS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const query = ParticipantListQuerySchema.parse(req.query);

      // TODO: Implement participant listing with filters
      // For now, return mock response
      const mockResponse = {
        participants: [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: 0,
          totalPages: 0,
        },
        filters: {
          status: query.status,
          siteId: query.siteId,
          dateRange: query.startDate && query.endDate ? {
            startDate: query.startDate,
            endDate: query.endDate,
          } : undefined,
        },
      };

      res.json(mockResponse);
    } catch (error) {
      next(error);
    }
  }
);

// POST /participants - Create new participant
router.post('/',
  requirePermission('ENROLL_PARTICIPANTS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const participantData = CreateParticipantRequestSchema.parse(req.body);

      // Check study access
      const user = (req as AuthenticatedRequest).user;
      if (user.role !== 'ADMIN' && !user.studyAccess?.includes(participantData.studyId)) {
        throw new ValidationError('Access to this study not permitted');
      }

      // TODO: Implement participant creation
      // For now, return mock response
      const mockParticipant = {
        id: 'mock-participant-id',
        studyId: participantData.studyId,
        externalId: participantData.externalId,
        status: 'PRESCREENING',
        enrollmentDate: new Date().toISOString(),
        screeningNumber: participantData.screeningNumber,
        siteId: participantData.siteId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.status(201).json(mockParticipant);
    } catch (error) {
      next(error);
    }
  }
);

// GET /participants/:participantId - Get participant details
router.get('/:participantId',
  requirePermission('VIEW_PARTICIPANTS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;

      // TODO: Implement participant retrieval
      // For now, return mock response or 404
      if (participantId === 'non-existent') {
        throw new NotFoundError('Participant not found');
      }

      const mockParticipant = {
        id: participantId,
        studyId: 'mock-study-id',
        externalId: 'MOCK-001',
        status: 'ACTIVE',
        enrollmentDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.json(mockParticipant);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /participants/:participantId - Update participant
router.patch('/:participantId',
  requirePermission('UPDATE_PARTICIPANTS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;

      // Validate request body
      const updateData = UpdateParticipantRequestSchema.parse(req.body);

      // TODO: Implement participant update with status transition validation
      // For now, return mock response
      if (participantId === 'non-existent') {
        throw new NotFoundError('Participant not found');
      }

      const mockUpdatedParticipant = {
        id: participantId,
        studyId: 'mock-study-id',
        externalId: 'MOCK-001',
        status: updateData.status || 'ACTIVE',
        enrollmentDate: new Date().toISOString(),
        withdrawalDate: updateData.withdrawalDate,
        withdrawalReason: updateData.withdrawalReason,
        completionDate: updateData.completionDate,
        randomizationCode: updateData.randomizationCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.json(mockUpdatedParticipant);
    } catch (error) {
      next(error);
    }
  }
);

// GET /participants/:participantId/history - Get enrollment history
router.get('/:participantId/history',
  requirePermission('VIEW_PARTICIPANTS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;

      // TODO: Implement enrollment history retrieval
      // For now, return mock response
      const mockHistory = [
        {
          id: 'history-1',
          participantId,
          fromStatus: 'PRESCREENING',
          toStatus: 'SCREENING',
          changedBy: 'user-123',
          changedDate: new Date().toISOString(),
          reason: 'Completed pre-screening questionnaire',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          createdAt: new Date().toISOString(),
        },
      ];

      res.json(mockHistory);
    } catch (error) {
      next(error);
    }
  }
);

export { router as participantRoutes };