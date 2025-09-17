import { Request, Response } from 'express';
import { FormModel } from '../models/Form';
import { Pool } from 'pg';
import {
  CreateFormRequest,
  UpdateFormRequest,
  FormStatus,
  PaginatedResponse,
  Form
} from '@research-study/shared';
import Joi from 'joi';

export class FormController {
  private formModel: FormModel;

  constructor(db: Pool) {
    this.formModel = new FormModel(db);
  }

  // Validation schemas
  private createFormSchema = Joi.object({
    studyId: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(100).required(),
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).optional(),
    schema: Joi.object({
      fields: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        type: Joi.string().valid(
          'TEXT', 'TEXTAREA', 'NUMBER', 'EMAIL', 'PASSWORD', 'DATE', 'DATETIME', 'TIME',
          'SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX', 'BOOLEAN', 'FILE', 'SIGNATURE',
          'RANGE', 'RATING', 'MATRIX', 'CALCULATED'
        ).required(),
        name: Joi.string().required(),
        label: Joi.string().required(),
        description: Joi.string().optional(),
        required: Joi.boolean().required(),
        readonly: Joi.boolean().optional(),
        defaultValue: Joi.any().optional(),
        options: Joi.array().items(Joi.object({
          value: Joi.string().required(),
          label: Joi.string().required(),
          description: Joi.string().optional(),
          disabled: Joi.boolean().optional()
        })).optional(),
        validation: Joi.object().optional(),
        conditionalLogic: Joi.object().optional(),
        properties: Joi.object().optional()
      })).required(),
      layout: Joi.object().optional(),
      conditionalLogic: Joi.array().optional(),
      validationGroups: Joi.array().optional()
    }).required(),
    validationRules: Joi.array().optional()
  });

  private updateFormSchema = Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    title: Joi.string().min(1).max(200).optional(),
    description: Joi.string().max(1000).optional().allow(null),
    schema: Joi.object().optional(),
    validationRules: Joi.array().optional(),
    status: Joi.string().valid('DRAFT', 'PUBLISHED', 'ARCHIVED').optional()
  });

  // Create new form
  createForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = this.createFormSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const formData: CreateFormRequest = value;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if form name already exists for this study
      const existingForm = await this.formModel.findByName(formData.studyId, formData.name);
      if (existingForm) {
        res.status(409).json({
          error: 'Form name already exists',
          message: `A form with name "${formData.name}" already exists for this study`
        });
        return;
      }

      const form = await this.formModel.create(formData, userId);

      res.status(201).json(form);
    } catch (error) {
      console.error('Error creating form:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create form'
      });
    }
  };

  // Get form by ID
  getForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid form ID' });
        return;
      }

      const form = await this.formModel.findById(id);

      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      res.json(form);
    } catch (error) {
      console.error('Error getting form:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve form'
      });
    }
  };

  // Get forms for a study
  getStudyForms = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const { status, page = '1', limit = '20' } = req.query;

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

      if (status && Object.values(FormStatus).includes(status as FormStatus)) {
        options.status = status as FormStatus;
      }

      const { forms, total } = await this.formModel.findByStudyId(studyId, options);

      const response: PaginatedResponse<Form> = {
        data: forms,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting study forms:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve forms'
      });
    }
  };

  // Update form
  updateForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = this.updateFormSchema.validate(req.body);

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid form ID' });
        return;
      }

      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const updateData: UpdateFormRequest = value;

      // Check if form exists
      const existingForm = await this.formModel.findById(id);
      if (!existingForm) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      // Prevent updates to published forms (should create new version instead)
      if (existingForm.status === FormStatus.PUBLISHED && updateData.schema) {
        res.status(400).json({
          error: 'Cannot modify published form',
          message: 'Create a new version to modify a published form'
        });
        return;
      }

      const updatedForm = await this.formModel.update(id, updateData);

      if (!updatedForm) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      res.json(updatedForm);
    } catch (error) {
      console.error('Error updating form:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update form'
      });
    }
  };

  // Create new version of form
  createFormVersion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = this.updateFormSchema.validate(req.body);

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid form ID' });
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

      const updateData: UpdateFormRequest = value;
      const newVersion = await this.formModel.createVersion(id, updateData, userId);

      res.status(201).json(newVersion);
    } catch (error) {
      console.error('Error creating form version:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create form version'
      });
    }
  };

  // Get form versions
  getFormVersions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId, name } = req.params;

      if (!studyId || !this.isValidUuid(studyId)) {
        res.status(400).json({ error: 'Invalid study ID' });
        return;
      }

      if (!name) {
        res.status(400).json({ error: 'Form name is required' });
        return;
      }

      const versions = await this.formModel.getVersions(studyId, name);

      res.json(versions);
    } catch (error) {
      console.error('Error getting form versions:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve form versions'
      });
    }
  };

  // Publish form
  publishForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid form ID' });
        return;
      }

      const publishedForm = await this.formModel.publish(id);

      if (!publishedForm) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      res.json(publishedForm);
    } catch (error) {
      console.error('Error publishing form:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to publish form'
      });
    }
  };

  // Archive form
  archiveForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid form ID' });
        return;
      }

      const archivedForm = await this.formModel.archive(id);

      if (!archivedForm) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      res.json(archivedForm);
    } catch (error) {
      console.error('Error archiving form:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to archive form'
      });
    }
  };

  // Validate form data
  validateFormData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { data } = req.body;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid form ID' });
        return;
      }

      if (!data || typeof data !== 'object') {
        res.status(400).json({ error: 'Form data is required' });
        return;
      }

      const form = await this.formModel.findById(id);
      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      const validationResult = await this.formModel.validateFormData(form, data);

      res.json(validationResult);
    } catch (error) {
      console.error('Error validating form data:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to validate form data'
      });
    }
  };

  // Delete form
  deleteForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid form ID' });
        return;
      }

      // Check if form exists and can be deleted
      const form = await this.formModel.findById(id);
      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      // Prevent deletion of published forms
      if (form.status === FormStatus.PUBLISHED) {
        res.status(400).json({
          error: 'Cannot delete published form',
          message: 'Archive the form instead of deleting it'
        });
        return;
      }

      const deleted = await this.formModel.delete(id);

      if (!deleted) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting form:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete form'
      });
    }
  };

  // Helper methods
  private isValidUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}