import { Request, Response } from 'express';
import { QueryModel } from '../models/Query';
import { Pool } from 'pg';
import {
  CreateQueryRequest,
  RespondToQueryRequest,
  QueryType,
  QueryPriority,
  QueryStatus,
  PaginatedResponse,
  Query
} from '@research-study/shared';
import Joi from 'joi';

export class QueryController {
  private queryModel: QueryModel;

  constructor(db: Pool) {
    this.queryModel = new QueryModel(db);
  }

  // Validation schemas
  private createQuerySchema = Joi.object({
    formResponseId: Joi.string().uuid().optional(),
    fieldId: Joi.string().optional(),
    studyId: Joi.string().uuid().required(),
    participantId: Joi.string().uuid().required(),
    type: Joi.string().valid(
      'DATA_CLARIFICATION', 'MISSING_DATA', 'INCONSISTENT_DATA', 'PROTOCOL_DEVIATION',
      'ADVERSE_EVENT', 'SAFETY_REPORT', 'GENERAL'
    ).required(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL').required(),
    subject: Joi.string().min(1).max(200).required(),
    description: Joi.string().min(1).max(2000).required(),
    currentValue: Joi.any().optional(),
    suggestedValue: Joi.any().optional(),
    assignedTo: Joi.string().uuid().optional(),
    dueDate: Joi.date().iso().optional()
  });

  private respondToQuerySchema = Joi.object({
    response: Joi.string().min(1).max(2000).required(),
    attachments: Joi.array().items(Joi.string()).optional(),
    isResolution: Joi.boolean().required()
  });

  private updateQuerySchema = Joi.object({
    subject: Joi.string().min(1).max(200).optional(),
    description: Joi.string().min(1).max(2000).optional(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL').optional(),
    status: Joi.string().valid('OPEN', 'PENDING_RESPONSE', 'ANSWERED', 'CLOSED', 'CANCELLED').optional(),
    assignedTo: Joi.string().uuid().optional().allow(null),
    dueDate: Joi.date().iso().optional().allow(null)
  });

  // Create new query
  createQuery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = this.createQuerySchema.validate(req.body);
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

      const queryData: CreateQueryRequest = value;

      const query = await this.queryModel.create(queryData, userId);

      res.status(201).json(query);
    } catch (error) {
      console.error('Error creating query:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create query'
      });
    }
  };

  // Get query by ID
  getQuery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid query ID' });
        return;
      }

      const query = await this.queryModel.findById(id);

      if (!query) {
        res.status(404).json({ error: 'Query not found' });
        return;
      }

      res.json(query);
    } catch (error) {
      console.error('Error getting query:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve query'
      });
    }
  };

  // Get queries for a study
  getStudyQueries = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const {
        status,
        priority,
        type,
        assignedTo,
        participantId,
        page = '1',
        limit = '20'
      } = req.query;

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

      if (status && Object.values(QueryStatus).includes(status as QueryStatus)) {
        options.status = status as QueryStatus;
      }

      if (priority && Object.values(QueryPriority).includes(priority as QueryPriority)) {
        options.priority = priority as QueryPriority;
      }

      if (type && Object.values(QueryType).includes(type as QueryType)) {
        options.type = type as QueryType;
      }

      if (assignedTo && this.isValidUuid(assignedTo as string)) {
        options.assignedTo = assignedTo as string;
      }

      if (participantId && this.isValidUuid(participantId as string)) {
        options.participantId = participantId as string;
      }

      const { queries, total } = await this.queryModel.findByStudy(studyId, options);

      const response: PaginatedResponse<Query> = {
        data: queries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting study queries:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve study queries'
      });
    }
  };

  // Get queries for a participant
  getParticipantQueries = async (req: Request, res: Response): Promise<void> => {
    try {
      const { participantId } = req.params;
      const { status, priority, page = '1', limit = '20' } = req.query;

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

      if (status && Object.values(QueryStatus).includes(status as QueryStatus)) {
        options.status = status as QueryStatus;
      }

      if (priority && Object.values(QueryPriority).includes(priority as QueryPriority)) {
        options.priority = priority as QueryPriority;
      }

      const { queries, total } = await this.queryModel.findByParticipant(participantId, options);

      const response: PaginatedResponse<Query> = {
        data: queries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting participant queries:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve participant queries'
      });
    }
  };

  // Get queries assigned to current user
  getAssignedQueries = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { status, priority, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const options: any = {
        limit: limitNum,
        offset
      };

      if (status && Object.values(QueryStatus).includes(status as QueryStatus)) {
        options.status = status as QueryStatus;
      }

      if (priority && Object.values(QueryPriority).includes(priority as QueryPriority)) {
        options.priority = priority as QueryPriority;
      }

      const { queries, total } = await this.queryModel.findAssignedToUser(userId, options);

      const response: PaginatedResponse<Query> = {
        data: queries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting assigned queries:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve assigned queries'
      });
    }
  };

  // Update query
  updateQuery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = this.updateQuerySchema.validate(req.body);

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid query ID' });
        return;
      }

      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const updatedQuery = await this.queryModel.update(id, value);

      if (!updatedQuery) {
        res.status(404).json({ error: 'Query not found' });
        return;
      }

      res.json(updatedQuery);
    } catch (error) {
      console.error('Error updating query:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update query'
      });
    }
  };

  // Add response to query
  respondToQuery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = this.respondToQuerySchema.validate(req.body);

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid query ID' });
        return;
      }

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

      const responseData: RespondToQueryRequest = value;

      // Check if query exists
      const query = await this.queryModel.findById(id);
      if (!query) {
        res.status(404).json({ error: 'Query not found' });
        return;
      }

      // Check if query is still open
      if (query.status === QueryStatus.CLOSED || query.status === QueryStatus.CANCELLED) {
        res.status(400).json({
          error: 'Cannot respond to closed query',
          message: 'This query has been closed and cannot receive new responses'
        });
        return;
      }

      const queryResponse = await this.queryModel.addResponse(id, responseData, userId);

      res.status(201).json(queryResponse);
    } catch (error) {
      console.error('Error responding to query:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to respond to query'
      });
    }
  };

  // Resolve query
  resolveQuery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { resolution } = req.body;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid query ID' });
        return;
      }

      if (!resolution || typeof resolution !== 'string') {
        res.status(400).json({ error: 'Resolution text is required' });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const resolvedQuery = await this.queryModel.resolve(id, resolution, userId);

      if (!resolvedQuery) {
        res.status(404).json({ error: 'Query not found' });
        return;
      }

      res.json(resolvedQuery);
    } catch (error) {
      console.error('Error resolving query:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to resolve query'
      });
    }
  };

  // Reopen query
  reopenQuery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid query ID' });
        return;
      }

      if (!reason || typeof reason !== 'string') {
        res.status(400).json({ error: 'Reason for reopening is required' });
        return;
      }

      const reopenedQuery = await this.queryModel.reopen(id, reason);

      if (!reopenedQuery) {
        res.status(404).json({ error: 'Query not found' });
        return;
      }

      res.json(reopenedQuery);
    } catch (error) {
      console.error('Error reopening query:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to reopen query'
      });
    }
  };

  // Assign query
  assignQuery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid query ID' });
        return;
      }

      if (assignedTo && !this.isValidUuid(assignedTo)) {
        res.status(400).json({ error: 'Invalid user ID for assignment' });
        return;
      }

      const assignedQuery = await this.queryModel.assign(id, assignedTo);

      if (!assignedQuery) {
        res.status(404).json({ error: 'Query not found' });
        return;
      }

      res.json(assignedQuery);
    } catch (error) {
      console.error('Error assigning query:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to assign query'
      });
    }
  };

  // Escalate query priority
  escalateQuery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { priority } = req.body;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid query ID' });
        return;
      }

      if (!priority || !Object.values(QueryPriority).includes(priority)) {
        res.status(400).json({ error: 'Valid priority is required' });
        return;
      }

      const escalatedQuery = await this.queryModel.escalate(id, priority as QueryPriority);

      if (!escalatedQuery) {
        res.status(404).json({ error: 'Query not found' });
        return;
      }

      res.json(escalatedQuery);
    } catch (error) {
      console.error('Error escalating query:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to escalate query'
      });
    }
  };

  // Get query statistics
  getQueryStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId, participantId } = req.query;

      if (studyId && !this.isValidUuid(studyId as string)) {
        res.status(400).json({ error: 'Invalid study ID' });
        return;
      }

      if (participantId && !this.isValidUuid(participantId as string)) {
        res.status(400).json({ error: 'Invalid participant ID' });
        return;
      }

      const statistics = await this.queryModel.getQueryStatistics(
        studyId as string,
        participantId as string
      );

      res.json(statistics);
    } catch (error) {
      console.error('Error getting query statistics:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve query statistics'
      });
    }
  };

  // Delete query
  deleteQuery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid query ID' });
        return;
      }

      // Check if query exists and can be deleted
      const query = await this.queryModel.findById(id);
      if (!query) {
        res.status(404).json({ error: 'Query not found' });
        return;
      }

      // Prevent deletion of queries with responses
      if (query.responses && query.responses.length > 0) {
        res.status(400).json({
          error: 'Cannot delete query with responses',
          message: 'Queries with responses cannot be deleted for audit trail purposes'
        });
        return;
      }

      const deleted = await this.queryModel.delete(id);

      if (!deleted) {
        res.status(404).json({ error: 'Query not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting query:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete query'
      });
    }
  };

  // Helper methods
  private isValidUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}