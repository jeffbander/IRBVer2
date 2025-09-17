import { Router, Request, Response, NextFunction } from 'express';
import { requirePermission } from '../middleware/auth';

const router = Router();

// POST /participants/:participantId/screening - Submit screening responses
router.post('/:participantId/screening',
  requirePermission('MANAGE_SCREENING'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;

      // TODO: Implement screening submission with eligibility evaluation
      const mockScreeningResponse = {
        id: 'mock-screening-id',
        participantId,
        questionnaireId: req.body.questionnaireId,
        responses: req.body.responses || [],
        eligibilityResult: {
          eligible: true,
          criteria: [],
          reviewRequired: false,
        },
        completedDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.status(201).json(mockScreeningResponse);
    } catch (error) {
      next(error);
    }
  }
);

// GET /participants/:participantId/screening - Get screening history
router.get('/:participantId/screening',
  requirePermission('VIEW_PARTICIPANTS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;

      // TODO: Implement screening history retrieval
      const mockHistory = [];

      res.json(mockHistory);
    } catch (error) {
      next(error);
    }
  }
);

export { router as screeningRoutes };