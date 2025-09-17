import { Request, Response } from 'express';
import { VisitModel } from '../models/Visit';
import { Pool } from 'pg';
import {
  CreateVisitDefinitionRequest,
  ScheduleVisitRequest,
  UpdateVisitRequest,
  VisitStatus,
  TimeUnit,
  PaginatedResponse,
  Visit,
  VisitDefinition
} from '@research-study/shared';
import Joi from 'joi';

export class VisitController {
  private visitModel: VisitModel;

  constructor(db: Pool) {
    this.visitModel = new VisitModel(db);
  }

  // Validation schemas
  private createVisitDefinitionSchema = Joi.object({
    studyId: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(100).required(),
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).optional(),
    visitNumber: Joi.number().integer().min(1).required(),
    isBaseline: Joi.boolean().required(),
    window: Joi.object({
      baselineOffset: Joi.number().integer().min(0).required(),
      earlyDays: Joi.number().integer().min(0).required(),
      lateDays: Joi.number().integer().min(0).required(),
      unit: Joi.string().valid('DAYS', 'WEEKS', 'MONTHS', 'YEARS').required()
    }).required(),
    procedures: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      title: Joi.string().required(),
      description: Joi.string().optional(),
      category: Joi.string().required(),
      duration: Joi.number().integer().min(0).optional(),
      required: Joi.boolean().required(),
      instructions: Joi.string().optional(),
      materials: Joi.array().items(Joi.string()).optional()
    })).required(),
    forms: Joi.array().items(Joi.string().uuid()).required(),
    mandatory: Joi.boolean().required()
  });

  private scheduleVisitSchema = Joi.object({
    participantId: Joi.string().uuid().required(),
    visitDefinitionId: Joi.string().uuid().required(),
    scheduledDate: Joi.date().iso().required(),
    notes: Joi.string().max(1000).optional()
  });

  private updateVisitSchema = Joi.object({
    scheduledDate: Joi.date().iso().optional(),
    actualDate: Joi.date().iso().optional(),
    status: Joi.string().valid(
      'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED', 'RESCHEDULED'
    ).optional(),
    notes: Joi.string().max(1000).optional().allow(null)
  });

  // Visit Definition Management

  createVisitDefinition = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = this.createVisitDefinitionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const visitDefData: CreateVisitDefinitionRequest = value;

      // Check if visit definition with same name or number already exists
      const existingDefs = await this.visitModel.findVisitDefinitionsByStudyId(visitDefData.studyId);
      const nameExists = existingDefs.some(def => def.name === visitDefData.name);
      const numberExists = existingDefs.some(def => def.visitNumber === visitDefData.visitNumber);

      if (nameExists) {
        res.status(409).json({
          error: 'Visit definition name already exists',
          message: `A visit definition with name "${visitDefData.name}" already exists for this study`
        });
        return;
      }

      if (numberExists) {
        res.status(409).json({
          error: 'Visit number already exists',
          message: `Visit number ${visitDefData.visitNumber} already exists for this study`
        });
        return;
      }

      const visitDefinition = await this.visitModel.createVisitDefinition(visitDefData);

      res.status(201).json(visitDefinition);
    } catch (error) {
      console.error('Error creating visit definition:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create visit definition'
      });
    }
  };

  getVisitDefinition = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid visit definition ID' });
        return;
      }

      const visitDefinition = await this.visitModel.findVisitDefinitionById(id);

      if (!visitDefinition) {
        res.status(404).json({ error: 'Visit definition not found' });
        return;
      }

      res.json(visitDefinition);
    } catch (error) {
      console.error('Error getting visit definition:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve visit definition'
      });
    }
  };

  getStudyVisitDefinitions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;

      if (!studyId || !this.isValidUuid(studyId)) {
        res.status(400).json({ error: 'Invalid study ID' });
        return;
      }

      const visitDefinitions = await this.visitModel.findVisitDefinitionsByStudyId(studyId);

      res.json(visitDefinitions);
    } catch (error) {
      console.error('Error getting study visit definitions:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve visit definitions'
      });
    }
  };

  updateVisitDefinition = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid visit definition ID' });
        return;
      }

      // Use subset of create schema for updates
      const updateSchema = this.createVisitDefinitionSchema.fork(
        ['studyId'],
        (schema) => schema.optional()
      );

      const { error, value } = updateSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const updatedDefinition = await this.visitModel.updateVisitDefinition(id, value);

      if (!updatedDefinition) {
        res.status(404).json({ error: 'Visit definition not found' });
        return;
      }

      res.json(updatedDefinition);
    } catch (error) {
      console.error('Error updating visit definition:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update visit definition'
      });
    }
  };

  // Visit Scheduling and Management

  scheduleVisit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = this.scheduleVisitSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const visitData: ScheduleVisitRequest = value;

      // Check if visit already exists for this participant and definition
      const existingVisits = await this.visitModel.findVisitsByParticipant(visitData.participantId);
      const visitExists = existingVisits.visits.some(
        visit => visit.visitDefinitionId === visitData.visitDefinitionId
      );

      if (visitExists) {
        res.status(409).json({
          error: 'Visit already scheduled',
          message: 'A visit for this definition is already scheduled for this participant'
        });
        return;
      }

      const visit = await this.visitModel.scheduleVisit(visitData, userId);

      res.status(201).json(visit);
    } catch (error) {
      console.error('Error scheduling visit:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to schedule visit'
      });
    }
  };

  getVisit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid visit ID' });
        return;
      }

      const visit = await this.visitModel.findVisitById(id);

      if (!visit) {
        res.status(404).json({ error: 'Visit not found' });
        return;
      }

      res.json(visit);
    } catch (error) {
      console.error('Error getting visit:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve visit'
      });
    }
  };

  getParticipantVisits = async (req: Request, res: Response): Promise<void> => {
    try {
      const { participantId } = req.params;
      const { status, page = '1', limit = '20' } = req.query;

      if (!participantId || !this.isValidUuid(participantId)) {
        res.status(400).json({ error: 'Invalid participant ID' });
        return;
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const options: any = {
        limit: limitNum,
        offset
      };

      if (status && Object.values(VisitStatus).includes(status as VisitStatus)) {
        options.status = status as VisitStatus;
      }

      const { visits, total } = await this.visitModel.findVisitsByParticipant(participantId, options);

      const response: PaginatedResponse<Visit> = {
        data: visits,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting participant visits:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve participant visits'
      });
    }
  };

  getStudyVisits = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const { status, dateFrom, dateTo, page = '1', limit = '20' } = req.query;

      if (!studyId || !this.isValidUuid(studyId)) {
        res.status(400).json({ error: 'Invalid study ID' });
        return;
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const options: any = {
        limit: limitNum,
        offset
      };

      if (status && Object.values(VisitStatus).includes(status as VisitStatus)) {
        options.status = status as VisitStatus;
      }

      if (dateFrom) {
        options.dateFrom = new Date(dateFrom as string);
      }

      if (dateTo) {
        options.dateTo = new Date(dateTo as string);
      }

      const { visits, total } = await this.visitModel.findVisitsByStudy(studyId, options);

      const response: PaginatedResponse<Visit> = {
        data: visits,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting study visits:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve study visits'
      });
    }
  };

  updateVisit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = this.updateVisitSchema.validate(req.body);

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid visit ID' });
        return;
      }

      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const updateData: UpdateVisitRequest = value;

      const updatedVisit = await this.visitModel.updateVisit(id, updateData);

      if (!updatedVisit) {
        res.status(404).json({ error: 'Visit not found' });
        return;
      }

      res.json(updatedVisit);
    } catch (error) {
      console.error('Error updating visit:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update visit'
      });
    }
  };

  updateVisitProcedures = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { procedures } = req.body;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid visit ID' });
        return;
      }

      if (!Array.isArray(procedures)) {
        res.status(400).json({ error: 'Procedures must be an array' });
        return;
      }

      const updatedVisit = await this.visitModel.updateVisitProcedures(id, procedures);

      if (!updatedVisit) {
        res.status(404).json({ error: 'Visit not found' });
        return;
      }

      res.json(updatedVisit);
    } catch (error) {
      console.error('Error updating visit procedures:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update visit procedures'
      });
    }
  };

  checkVisitDeviations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid visit ID' });
        return;
      }

      const visit = await this.visitModel.findVisitById(id);

      if (!visit) {
        res.status(404).json({ error: 'Visit not found' });
        return;
      }

      const deviations = await this.visitModel.checkForDeviations(visit);

      res.json({
        visitId: id,
        deviations,
        hasDeviations: deviations.length > 0
      });
    } catch (error) {
      console.error('Error checking visit deviations:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check visit deviations'
      });
    }
  };

  deleteVisit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid visit ID' });
        return;
      }

      // Check if visit exists and can be deleted
      const visit = await this.visitModel.findVisitById(id);
      if (!visit) {
        res.status(404).json({ error: 'Visit not found' });
        return;
      }

      // Prevent deletion of completed visits
      if (visit.status === VisitStatus.COMPLETED) {
        res.status(400).json({
          error: 'Cannot delete completed visit',
          message: 'Completed visits cannot be deleted for audit trail purposes'
        });
        return;
      }

      const deleted = await this.visitModel.deleteVisit(id);

      if (!deleted) {
        res.status(404).json({ error: 'Visit not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting visit:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete visit'
      });
    }
  };

  // Helper methods
  private isValidUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}