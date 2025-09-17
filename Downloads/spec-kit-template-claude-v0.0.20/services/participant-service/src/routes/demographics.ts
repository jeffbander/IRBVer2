import { Router, Request, Response, NextFunction } from 'express';
import { CreateDemographicsRequestSchema } from '@research-study/shared';
import { requirePermission, requirePHIAccess } from '../middleware/auth';

const router = Router();

// POST /participants/:participantId/demographics - Record demographics
router.post('/:participantId/demographics',
  requirePermission('MANAGE_DEMOGRAPHICS'),
  requirePHIAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;
      const demographicsData = CreateDemographicsRequestSchema.parse(req.body);

      // TODO: Implement demographics recording with encryption
      const mockDemographics = {
        id: 'mock-demographics-id',
        participantId,
        gender: demographicsData.gender,
        race: demographicsData.race,
        ethnicity: demographicsData.ethnicity,
        primaryLanguage: demographicsData.primaryLanguage,
        dataEncrypted: true,
        consentToContact: demographicsData.consentToContact,
        preferredContactMethod: demographicsData.preferredContactMethod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.status(201).json(mockDemographics);
    } catch (error) {
      next(error);
    }
  }
);

// GET /participants/:participantId/demographics - Get demographics
router.get('/:participantId/demographics',
  requirePermission('VIEW_DEMOGRAPHICS'),
  requirePHIAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId } = req.params;

      // TODO: Implement demographics retrieval with decryption
      const mockDemographics = {
        participantId,
        gender: 'FEMALE',
        race: ['WHITE'],
        ethnicity: 'NOT_HISPANIC_LATINO',
        dataEncrypted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.json(mockDemographics);
    } catch (error) {
      next(error);
    }
  }
);

export { router as demographicsRoutes };