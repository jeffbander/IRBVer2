import { Request, Response } from 'express';
import { ResponseModel } from '../models/Response';
import { FormModel } from '../models/Form';
import { Pool } from 'pg';
import {
  CreateFormResponseRequest,
  UpdateFormResponseRequest,
  ResponseStatus,
  SignatureMeaning,
  AuthenticationMethod,
  ResponseMetadata,
  PaginatedResponse,
  FormResponse
} from '@research-study/shared';
import Joi from 'joi';

export class ResponseController {
  private responseModel: ResponseModel;
  private formModel: FormModel;

  constructor(db: Pool) {
    this.responseModel = new ResponseModel(db);
    this.formModel = new FormModel(db);
  }

  // Validation schemas
  private createResponseSchema = Joi.object({
    formId: Joi.string().uuid().required(),
    participantId: Joi.string().uuid().required(),
    visitId: Joi.string().uuid().optional(),
    data: Joi.object().required()
  });

  private updateResponseSchema = Joi.object({
    data: Joi.object().optional(),
    status: Joi.string().valid(
      'DRAFT', 'PARTIAL', 'COMPLETE', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED', 'LOCKED'
    ).optional()
  });

  private signatureSchema = Joi.object({
    meaning: Joi.string().valid('AUTHORED', 'REVIEWED', 'APPROVED', 'WITNESSED', 'VERIFIED').required(),
    authMethod: Joi.string().valid('PASSWORD', 'BIOMETRIC', 'TOKEN', 'MULTI_FACTOR').required(),
    biometricData: Joi.object().optional()
  });

  // Create new form response
  createResponse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = this.createResponseSchema.validate(req.body);
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

      const responseData: CreateFormResponseRequest = value;

      // Check if form exists
      const form = await this.formModel.findById(responseData.formId);
      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      // Check if response already exists for this combination
      const existingResponse = await this.responseModel.findByParticipantAndForm(
        responseData.participantId,
        responseData.formId,
        responseData.visitId
      );

      if (existingResponse) {
        res.status(409).json({
          error: 'Response already exists',
          message: 'A response for this form and participant already exists'
        });
        return;
      }

      // Create metadata
      const metadata: ResponseMetadata = {
        version: form.version,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        startTime: new Date(),
        browser: this.parseBrowserInfo(req.get('User-Agent'))
      };

      // Validate form data against form schema
      const validationResult = await this.formModel.validateFormData(form, responseData.data);

      const response = await this.responseModel.create(responseData, userId, metadata);

      // Add validation results if any
      if (validationResult.errors.length > 0) {
        await this.responseModel.validateResponse(response.id, validationResult.errors);
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating response:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create response'
      });
    }
  };

  // Get response by ID
  getResponse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid response ID' });
        return;
      }

      const response = await this.responseModel.findById(id);

      if (!response) {
        res.status(404).json({ error: 'Response not found' });
        return;
      }

      res.json(response);
    } catch (error) {
      console.error('Error getting response:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve response'
      });
    }
  };

  // Get responses for a participant
  getParticipantResponses = async (req: Request, res: Response): Promise<void> => {
    try {
      const { participantId } = req.params;
      const { status, formId, visitId, page = '1', limit = '20' } = req.query;

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

      if (status && Object.values(ResponseStatus).includes(status as ResponseStatus)) {
        options.status = status as ResponseStatus;
      }

      if (formId && this.isValidUuid(formId as string)) {
        options.formId = formId as string;
      }

      if (visitId && this.isValidUuid(visitId as string)) {
        options.visitId = visitId as string;
      }

      const { responses, total } = await this.responseModel.findByParticipant(participantId, options);

      const response: PaginatedResponse<FormResponse> = {
        data: responses,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting participant responses:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve participant responses'
      });
    }
  };

  // Update response
  updateResponse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = this.updateResponseSchema.validate(req.body);

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid response ID' });
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

      const updateData: UpdateFormResponseRequest = value;

      // Check if response exists and can be updated
      const existingResponse = await this.responseModel.findById(id);
      if (!existingResponse) {
        res.status(404).json({ error: 'Response not found' });
        return;
      }

      // Prevent updates to locked responses
      if (existingResponse.status === ResponseStatus.LOCKED) {
        res.status(400).json({
          error: 'Cannot update locked response',
          message: 'This response has been locked and cannot be modified'
        });
        return;
      }

      // Validate form data if provided
      if (updateData.data) {
        const form = await this.formModel.findById(existingResponse.formId);
        if (form) {
          const validationResult = await this.formModel.validateFormData(form, updateData.data);

          // Update validation results
          await this.responseModel.validateResponse(id, validationResult.errors);

          // Prevent submission if there are validation errors
          if (updateData.status === ResponseStatus.SUBMITTED && !validationResult.isValid) {
            res.status(400).json({
              error: 'Cannot submit response with validation errors',
              validationErrors: validationResult.errors
            });
            return;
          }
        }
      }

      // Create metadata for the update
      const metadata: ResponseMetadata = {
        version: existingResponse.metadata.version,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        startTime: existingResponse.metadata.startTime,
        submitTime: updateData.status === ResponseStatus.SUBMITTED ? new Date() : undefined,
        browser: this.parseBrowserInfo(req.get('User-Agent'))
      };

      const updatedResponse = await this.responseModel.update(id, updateData, userId, metadata);

      if (!updatedResponse) {
        res.status(404).json({ error: 'Response not found' });
        return;
      }

      res.json(updatedResponse);
    } catch (error) {
      console.error('Error updating response:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update response'
      });
    }
  };

  // Add electronic signature
  addSignature = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = this.signatureSchema.validate(req.body);

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid response ID' });
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
      const userEmail = req.user?.email;
      const userRole = req.user?.role;

      if (!userId || !userEmail || !userRole) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { meaning, authMethod, biometricData } = value;

      // Check if response exists
      const response = await this.responseModel.findById(id);
      if (!response) {
        res.status(404).json({ error: 'Response not found' });
        return;
      }

      // Check if response is in a signable state
      if (response.status !== ResponseStatus.SUBMITTED && response.status !== ResponseStatus.REVIEWED) {
        res.status(400).json({
          error: 'Response not ready for signature',
          message: 'Response must be submitted or reviewed before it can be signed'
        });
        return;
      }

      const signature = await this.responseModel.addElectronicSignature(
        id,
        userId,
        userEmail,
        userRole,
        meaning as SignatureMeaning,
        authMethod as AuthenticationMethod,
        req.ip || 'unknown',
        biometricData
      );

      res.status(201).json(signature);
    } catch (error) {
      console.error('Error adding signature:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to add signature'
      });
    }
  };

  // Validate response data
  validateResponse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid response ID' });
        return;
      }

      const response = await this.responseModel.findById(id);
      if (!response) {
        res.status(404).json({ error: 'Response not found' });
        return;
      }

      const form = await this.formModel.findById(response.formId);
      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      const validationResult = await this.formModel.validateFormData(form, response.data);

      // Update validation results
      await this.responseModel.validateResponse(id, validationResult.errors);

      res.json(validationResult);
    } catch (error) {
      console.error('Error validating response:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to validate response'
      });
    }
  };

  // Lock response
  lockResponse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid response ID' });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const lockedResponse = await this.responseModel.lockResponse(id, userId);

      if (!lockedResponse) {
        res.status(404).json({ error: 'Response not found or already locked' });
        return;
      }

      res.json(lockedResponse);
    } catch (error) {
      console.error('Error locking response:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to lock response'
      });
    }
  };

  // Unlock response
  unlockResponse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid response ID' });
        return;
      }

      if (!reason || typeof reason !== 'string') {
        res.status(400).json({ error: 'Reason for unlocking is required' });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const unlockedResponse = await this.responseModel.unlockResponse(id, userId, reason);

      if (!unlockedResponse) {
        res.status(404).json({ error: 'Response not found or not locked' });
        return;
      }

      res.json(unlockedResponse);
    } catch (error) {
      console.error('Error unlocking response:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to unlock response'
      });
    }
  };

  // Get audit trail
  getAuditTrail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid response ID' });
        return;
      }

      const auditTrail = await this.responseModel.getAuditTrail(id);

      res.json(auditTrail);
    } catch (error) {
      console.error('Error getting audit trail:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve audit trail'
      });
    }
  };

  // Delete response
  deleteResponse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid response ID' });
        return;
      }

      if (!reason || typeof reason !== 'string') {
        res.status(400).json({ error: 'Reason for deletion is required' });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if response exists and can be deleted
      const response = await this.responseModel.findById(id);
      if (!response) {
        res.status(404).json({ error: 'Response not found' });
        return;
      }

      // Prevent deletion of locked or signed responses
      if (response.status === ResponseStatus.LOCKED) {
        res.status(400).json({
          error: 'Cannot delete locked response',
          message: 'Unlock the response before deleting'
        });
        return;
      }

      if (response.signatures && response.signatures.length > 0) {
        res.status(400).json({
          error: 'Cannot delete signed response',
          message: 'Responses with electronic signatures cannot be deleted'
        });
        return;
      }

      const deleted = await this.responseModel.delete(id, userId, reason);

      if (!deleted) {
        res.status(404).json({ error: 'Response not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting response:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete response'
      });
    }
  };

  // Helper methods
  private isValidUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  private parseBrowserInfo(userAgent?: string): any {
    if (!userAgent) {
      return {
        name: 'unknown',
        version: 'unknown',
        os: 'unknown',
        mobile: false
      };
    }

    // Simple browser detection (in production, use a proper library like ua-parser-js)
    const mobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    let name = 'unknown';
    let version = 'unknown';
    let os = 'unknown';

    if (userAgent.includes('Chrome')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/([0-9.]+)/);
      version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/([0-9.]+)/);
      version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Safari')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/([0-9.]+)/);
      version = match ? match[1] : 'unknown';
    }

    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iOS')) {
      os = 'iOS';
    }

    return { name, version, os, mobile };
  }
}