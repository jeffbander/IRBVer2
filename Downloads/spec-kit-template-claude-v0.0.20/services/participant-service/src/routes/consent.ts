import { Router, Request, Response, NextFunction } from 'express';
import { CreateConsentRequestSchema } from '@research-study/shared';
import { requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { NotFoundError } from '../middleware/errorHandler';

const router = Router();

// POST /participants/:participantId/consent - Record new consent
router.post('/:participantId/consent',
  requirePermission('MANAGE_CONSENT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;
      const consentData = CreateConsentRequestSchema.parse(req.body);

      // TODO: Implement consent recording with IP tracking
      // For now, return mock response
      const mockConsent = {
        id: 'mock-consent-id',
        participantId,
        studyId: consentData.studyId,
        version: consentData.version,
        consentType: consentData.consentType,
        status: 'SIGNED',
        consentDate: new Date().toISOString(),
        documentId: consentData.documentId,
        witnessId: consentData.witnessId,
        witnessName: consentData.witnessName,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        electronicSignature: consentData.electronicSignature,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.status(201).json(mockConsent);
    } catch (error) {
      next(error);
    }
  }
);

// GET /participants/:participantId/consent - Get consent history
router.get('/:participantId/consent',
  requirePermission('VIEW_PARTICIPANTS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;
      const { type } = req.query;

      // TODO: Implement consent history retrieval
      // For now, return mock response
      const mockConsents = [
        {
          id: 'consent-1',
          participantId,
          version: '1.0',
          consentType: 'MAIN_STUDY',
          status: 'SIGNED',
          consentDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      // Filter by type if provided
      const filteredConsents = type ?
        mockConsents.filter(c => c.consentType === type) :
        mockConsents;

      res.json(filteredConsents);
    } catch (error) {
      next(error);
    }
  }
);

export { router as consentRoutes };