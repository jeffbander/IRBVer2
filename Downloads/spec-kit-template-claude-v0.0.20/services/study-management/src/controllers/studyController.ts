import { Request, Response } from 'express';
import {
  CreateStudyRequestSchema,
  UpdateStudyRequestSchema,
  StudyFiltersSchema,
  UUIDSchema,
  CreateIRBSubmissionRequestSchema,
  StudyStatus,
  UserRole
} from '@research-study/shared';
import { StudyModel } from '../models/study';
import { IRBSubmissionModel } from '../models/irbSubmission';
import { ParticipantModel } from '../models/participant';
import { UserModel } from '../models/user';
import { createLogger } from '@research-study/shared';
import { ZodError } from 'zod';

const logger = createLogger('StudyController');

export class StudyController {

  /**
   * Create a new study
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = CreateStudyRequestSchema.parse(req.body);

      // Verify that the principal investigator exists and has the correct role
      const pi = await UserModel.findById(validatedData.principalInvestigatorId);
      if (!pi) {
        res.status(400).json({
          error: 'Invalid principal investigator',
          message: 'Principal investigator not found',
        });
        return;
      }

      if (pi.role !== UserRole.PRINCIPAL_INVESTIGATOR) {
        res.status(400).json({
          error: 'Invalid principal investigator',
          message: 'User must have Principal Investigator role',
        });
        return;
      }

      const auditContext = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
      };

      const study = await StudyModel.create(validatedData, req.user!.id, auditContext);

      logger.info('Study created successfully', {
        studyId: study.id,
        protocolNumber: study.protocolNumber,
        createdBy: req.user!.id,
      });

      res.status(201).json(study);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request data',
          details: error.errors,
        });
        return;
      }

      logger.error('Failed to create study', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
        body: req.body,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create study',
      });
    }
  }

  /**
   * Get study by ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const studyId = UUIDSchema.parse(req.params.id);

      const study = await StudyModel.findById(studyId, true, true);
      if (!study) {
        res.status(404).json({
          error: 'Study not found',
          message: `Study with ID ${studyId} does not exist`,
        });
        return;
      }

      res.json(study);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid study ID',
          message: 'Study ID must be a valid UUID',
        });
        return;
      }

      logger.error('Failed to get study', {
        error: error instanceof Error ? error.message : error,
        studyId: req.params.id,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve study',
      });
    }
  }

  /**
   * Update study
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const studyId = UUIDSchema.parse(req.params.id);
      const validatedData = UpdateStudyRequestSchema.parse(req.body);

      // If updating principal investigator, verify the new PI
      if (validatedData.principalInvestigatorId) {
        const pi = await UserModel.findById(validatedData.principalInvestigatorId);
        if (!pi || pi.role !== UserRole.PRINCIPAL_INVESTIGATOR) {
          res.status(400).json({
            error: 'Invalid principal investigator',
            message: 'Principal investigator not found or invalid role',
          });
          return;
        }
      }

      const auditContext = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
      };

      const study = await StudyModel.update(studyId, validatedData, req.user!.id, auditContext);
      if (!study) {
        res.status(404).json({
          error: 'Study not found',
          message: `Study with ID ${studyId} does not exist`,
        });
        return;
      }

      logger.info('Study updated successfully', {
        studyId,
        updatedBy: req.user!.id,
        changes: Object.keys(validatedData),
      });

      res.json(study);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request data',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('Invalid status transition')) {
        res.status(400).json({
          error: 'Invalid status transition',
          message: error.message,
        });
        return;
      }

      logger.error('Failed to update study', {
        error: error instanceof Error ? error.message : error,
        studyId: req.params.id,
        userId: req.user?.id,
        body: req.body,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update study',
      });
    }
  }

  /**
   * Delete study (soft delete)
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const studyId = UUIDSchema.parse(req.params.id);

      const auditContext = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
      };

      const success = await StudyModel.delete(studyId, req.user!.id, auditContext);
      if (!success) {
        res.status(404).json({
          error: 'Study not found',
          message: `Study with ID ${studyId} does not exist`,
        });
        return;
      }

      logger.info('Study deleted successfully', {
        studyId,
        deletedBy: req.user!.id,
      });

      res.status(204).send();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid study ID',
          message: 'Study ID must be a valid UUID',
        });
        return;
      }

      logger.error('Failed to delete study', {
        error: error instanceof Error ? error.message : error,
        studyId: req.params.id,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete study',
      });
    }
  }

  /**
   * List studies with filtering and pagination
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const filters = StudyFiltersSchema.parse(req.query);

      // If user is not admin, only show studies they have access to
      if (req.user!.role !== UserRole.ADMIN) {
        // For non-admin users, we'll filter in the model based on their assignments
        // This could be enhanced to pass the user ID to the model
      }

      const result = await StudyModel.list(filters);

      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid query parameters',
          details: error.errors,
        });
        return;
      }

      logger.error('Failed to list studies', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
        query: req.query,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve studies',
      });
    }
  }

  /**
   * Submit study to IRB
   */
  static async submitToIRB(req: Request, res: Response): Promise<void> {
    try {
      const studyId = UUIDSchema.parse(req.params.id);
      const validatedData = CreateIRBSubmissionRequestSchema.parse(req.body);

      const auditContext = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
      };

      // Create IRB submission
      const submission = await IRBSubmissionModel.create(
        studyId,
        validatedData,
        req.user!.id,
        auditContext
      );

      // Submit the IRB submission
      const submittedSubmission = await IRBSubmissionModel.submit(
        submission.id,
        req.user!.id,
        auditContext
      );

      logger.info('Study submitted to IRB', {
        studyId,
        submissionId: submission.id,
        submissionNumber: submission.submissionNumber,
        submittedBy: req.user!.id,
      });

      res.json(submittedSubmission);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request data',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error) {
        // Handle business logic errors
        if (error.message.includes('Study not found') ||
            error.message.includes('Study must be in') ||
            error.message.includes('Missing required documents')) {
          res.status(400).json({
            error: 'Submission requirements not met',
            message: error.message,
          });
          return;
        }
      }

      logger.error('Failed to submit study to IRB', {
        error: error instanceof Error ? error.message : error,
        studyId: req.params.id,
        userId: req.user?.id,
        body: req.body,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to submit study to IRB',
      });
    }
  }

  /**
   * Get study statistics
   */
  static async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const studyId = UUIDSchema.parse(req.params.id);

      const [studyStats, participantStats] = await Promise.all([
        StudyModel.getStudyStats(studyId),
        ParticipantModel.getStudyParticipantStats(studyId),
      ]);

      const statistics = {
        study: studyStats,
        participants: participantStats,
      };

      res.json(statistics);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid study ID',
          message: 'Study ID must be a valid UUID',
        });
        return;
      }

      logger.error('Failed to get study statistics', {
        error: error instanceof Error ? error.message : error,
        studyId: req.params.id,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve study statistics',
      });
    }
  }

  /**
   * Get studies by principal investigator
   */
  static async getByPI(req: Request, res: Response): Promise<void> {
    try {
      const piId = UUIDSchema.parse(req.params.piId);

      const studies = await StudyModel.findByPI(piId);

      res.json({ data: studies });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid PI ID',
          message: 'Principal investigator ID must be a valid UUID',
        });
        return;
      }

      logger.error('Failed to get studies by PI', {
        error: error instanceof Error ? error.message : error,
        piId: req.params.piId,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve studies',
      });
    }
  }

  /**
   * Update study status
   */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const studyId = UUIDSchema.parse(req.params.id);
      const { status, reason } = req.body;

      if (!status || !Object.values(StudyStatus).includes(status)) {
        res.status(400).json({
          error: 'Invalid status',
          message: 'Status must be a valid StudyStatus value',
        });
        return;
      }

      const auditContext = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
      };

      const study = await StudyModel.update(
        studyId,
        { status },
        req.user!.id,
        auditContext
      );

      if (!study) {
        res.status(404).json({
          error: 'Study not found',
          message: `Study with ID ${studyId} does not exist`,
        });
        return;
      }

      logger.info('Study status updated', {
        studyId,
        newStatus: status,
        reason,
        updatedBy: req.user!.id,
      });

      res.json(study);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid study ID',
          message: 'Study ID must be a valid UUID',
        });
        return;
      }

      if (error instanceof Error && error.message.includes('Invalid status transition')) {
        res.status(400).json({
          error: 'Invalid status transition',
          message: error.message,
        });
        return;
      }

      logger.error('Failed to update study status', {
        error: error instanceof Error ? error.message : error,
        studyId: req.params.id,
        userId: req.user?.id,
        body: req.body,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update study status',
      });
    }
  }

  /**
   * Get IRB submissions for a study
   */
  static async getIRBSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const studyId = UUIDSchema.parse(req.params.id);

      const submissions = await IRBSubmissionModel.findByStudyId(studyId);

      res.json({ data: submissions });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid study ID',
          message: 'Study ID must be a valid UUID',
        });
        return;
      }

      logger.error('Failed to get IRB submissions', {
        error: error instanceof Error ? error.message : error,
        studyId: req.params.id,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve IRB submissions',
      });
    }
  }
}