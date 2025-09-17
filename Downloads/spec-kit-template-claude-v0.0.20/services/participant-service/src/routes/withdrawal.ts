import { Router, Request, Response, NextFunction } from 'express';
import { CreateWithdrawalRequestSchema } from '@research-study/shared';
import { requirePermission } from '../middleware/auth';
import { NotFoundError } from '../middleware/errorHandler';

const router = Router();

// POST /participants/:participantId/withdraw - Submit withdrawal request
router.post('/:participantId/withdraw',
  requirePermission('MANAGE_WITHDRAWAL'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;
      const withdrawalData = CreateWithdrawalRequestSchema.parse(req.body);

      // TODO: Implement withdrawal request processing
      const mockWithdrawal = {
        id: 'mock-withdrawal-id',
        participantId,
        requestDate: new Date().toISOString(),
        effectiveDate: withdrawalData.effectiveDate,
        reason: withdrawalData.reason,
        customReason: withdrawalData.customReason,
        dataRetention: withdrawalData.dataRetention,
        futureContact: withdrawalData.futureContact,
        status: 'REQUESTED',
        notifications: withdrawalData.notifications,
        notes: withdrawalData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.status(201).json(mockWithdrawal);
    } catch (error) {
      next(error);
    }
  }
);

// GET /participants/:participantId/withdrawal - Get withdrawal request
router.get('/:participantId/withdrawal',
  requirePermission('VIEW_PARTICIPANTS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;

      // TODO: Implement withdrawal request retrieval
      if (participantId === 'active-participant') {
        throw new NotFoundError('No withdrawal request found');
      }

      const mockWithdrawal = {
        id: 'withdrawal-1',
        participantId,
        requestDate: new Date().toISOString(),
        effectiveDate: new Date().toISOString(),
        reason: 'PERSONAL_REASONS',
        dataRetention: 'RETAIN_ANONYMIZED',
        status: 'PROCESSED',
      };

      res.json(mockWithdrawal);
    } catch (error) {
      next(error);
    }
  }
);

export { router as withdrawalRoutes };