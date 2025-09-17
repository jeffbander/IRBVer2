import { Request, Response } from 'express';
import {
  CreateParticipantRequestSchema,
  ParticipantFiltersSchema,
  UUIDSchema,
  ParticipantStatus
} from '@research-study/shared';
import { ParticipantModel } from '../models/participant';
import { createLogger } from '@research-study/shared';
import { ZodError } from 'zod';

const logger = createLogger('ParticipantController');

export class ParticipantController {

  /**
   * Create a new participant
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const studyId = UUIDSchema.parse(req.params.id);
      const validatedData = CreateParticipantRequestSchema.parse(req.body);

      const auditContext = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
      };

      const participant = await ParticipantModel.create(
        studyId,
        validatedData,
        req.user!.id,
        auditContext
      );

      logger.info('Participant created successfully', {
        participantId: participant.id,
        studyId,
        externalId: participant.externalId,
        createdBy: req.user!.id,
      });

      res.status(201).json(participant);
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
        if (error.message.includes('already exists')) {
          res.status(409).json({
            error: 'Participant already exists',
            message: error.message,
          });
          return;
        }

        if (error.message.includes('does not allow participant enrollment')) {
          res.status(400).json({
            error: 'Enrollment not allowed',
            message: error.message,
          });
          return;
        }
      }

      logger.error('Failed to create participant', {
        error: error instanceof Error ? error.message : error,
        studyId: req.params.id,
        userId: req.user?.id,
        body: req.body,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create participant',
      });
    }
  }

  /**
   * List participants for a study
   */
  static async listByStudy(req: Request, res: Response): Promise<void> {
    try {
      const studyId = UUIDSchema.parse(req.params.id);
      const filters = ParticipantFiltersSchema.parse(req.query);

      const result = await ParticipantModel.list(studyId, filters);

      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request parameters',
          details: error.errors,
        });
        return;
      }

      logger.error('Failed to list participants', {
        error: error instanceof Error ? error.message : error,
        studyId: req.params.id,
        userId: req.user?.id,
        query: req.query,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve participants',
      });
    }
  }

  /**
   * Get participant by ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const participantId = UUIDSchema.parse(req.params.participantId);

      const participant = await ParticipantModel.findById(participantId);
      if (!participant) {
        res.status(404).json({
          error: 'Participant not found',
          message: `Participant with ID ${participantId} does not exist`,
        });
        return;
      }

      res.json(participant);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid participant ID',
          message: 'Participant ID must be a valid UUID',
        });
        return;
      }

      logger.error('Failed to get participant', {
        error: error instanceof Error ? error.message : error,
        participantId: req.params.participantId,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve participant',
      });
    }
  }

  /**
   * Update participant status
   */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const participantId = UUIDSchema.parse(req.params.participantId);
      const { status, reason } = req.body;

      if (!status || !Object.values(ParticipantStatus).includes(status)) {
        res.status(400).json({
          error: 'Invalid status',
          message: 'Status must be a valid ParticipantStatus value',
        });
        return;
      }

      const auditContext = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
      };

      const participant = await ParticipantModel.updateStatus(
        participantId,
        status,
        req.user!.id,
        reason,
        auditContext
      );

      if (!participant) {
        res.status(404).json({
          error: 'Participant not found',
          message: `Participant with ID ${participantId} does not exist`,
        });
        return;
      }

      logger.info('Participant status updated', {
        participantId,
        newStatus: status,
        reason,
        updatedBy: req.user!.id,
      });

      res.json(participant);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid participant ID',
          message: 'Participant ID must be a valid UUID',
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

      logger.error('Failed to update participant status', {
        error: error instanceof Error ? error.message : error,
        participantId: req.params.participantId,
        userId: req.user?.id,
        body: req.body,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update participant status',
      });
    }
  }

  /**
   * Enroll participant
   */
  static async enroll(req: Request, res: Response): Promise<void> {
    try {
      const participantId = UUIDSchema.parse(req.params.participantId);
      const { randomizationArm, enrollmentDate } = req.body;

      const enrollmentData = {
        randomizationArm,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
      };

      const auditContext = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
      };

      const participant = await ParticipantModel.enroll(
        participantId,
        enrollmentData,
        req.user!.id,
        auditContext
      );

      if (!participant) {
        res.status(404).json({
          error: 'Participant not found',
          message: `Participant with ID ${participantId} does not exist`,
        });
        return;
      }

      logger.info('Participant enrolled', {
        participantId,
        randomizationArm,
        enrolledBy: req.user!.id,
      });

      res.json(participant);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid participant ID',
          message: 'Participant ID must be a valid UUID',
        });
        return;
      }

      if (error instanceof Error && error.message.includes('Cannot enroll participant')) {
        res.status(400).json({
          error: 'Enrollment not allowed',
          message: error.message,
        });
        return;
      }

      logger.error('Failed to enroll participant', {
        error: error instanceof Error ? error.message : error,
        participantId: req.params.participantId,
        userId: req.user?.id,
        body: req.body,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to enroll participant',
      });
    }
  }
}