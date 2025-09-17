import { Router, Request, Response, NextFunction } from 'express';
import { CreateCommunicationRequestSchema } from '@research-study/shared';
import { requirePermission } from '../middleware/auth';

const router = Router();

// POST /participants/:participantId/communications - Send communication
router.post('/:participantId/communications',
  requirePermission('MANAGE_COMMUNICATIONS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;
      const communicationData = CreateCommunicationRequestSchema.parse(req.body);

      // TODO: Implement communication sending
      const mockCommunication = {
        id: 'mock-communication-id',
        participantId,
        studyId: communicationData.studyId,
        type: communicationData.type,
        method: communicationData.method,
        subject: communicationData.subject,
        content: communicationData.content,
        scheduledDate: communicationData.scheduledDate,
        status: communicationData.scheduledDate ? 'SCHEDULED' : 'PENDING',
        templateId: communicationData.templateId,
        deliveryAttempts: 0,
        createdBy: 'user-123', // From auth middleware
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.status(201).json(mockCommunication);
    } catch (error) {
      next(error);
    }
  }
);

// GET /participants/:participantId/communications - Get communication history
router.get('/:participantId/communications',
  requirePermission('VIEW_PARTICIPANTS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;
      const { type, status, page = 1, limit = 10 } = req.query;

      // TODO: Implement communication history retrieval
      const mockCommunications = [
        {
          id: 'comm-1',
          participantId,
          type: 'WELCOME',
          method: 'EMAIL',
          subject: 'Welcome to Study',
          status: 'SENT',
          deliveryAttempts: 1,
          createdAt: new Date().toISOString(),
        },
      ];

      res.json(mockCommunications);
    } catch (error) {
      next(error);
    }
  }
);

export { router as communicationRoutes };