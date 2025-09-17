import { Request, Response } from 'express';
import {
  CreateStudyAssignmentRequestSchema,
  UUIDSchema,
  AssignmentRole
} from '@research-study/shared';
import { createLogger } from '@research-study/shared';
import { ZodError } from 'zod';
import { db, transformers, auditLog } from '../utils/database';

const logger = createLogger('StudyAssignmentController');

export class StudyAssignmentController {

  /**
   * Create a new study assignment
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const studyId = UUIDSchema.parse(req.params.id);
      const validatedData = CreateStudyAssignmentRequestSchema.parse(req.body);

      // Check if assignment already exists
      const existingQuery = `
        SELECT id FROM study_assignments
        WHERE study_id = $1 AND user_id = $2 AND role = $3 AND is_active = true
      `;
      const existing = await db.query(existingQuery, [
        studyId,
        validatedData.userId,
        validatedData.role
      ]);

      if (existing.rows.length > 0) {
        res.status(409).json({
          error: 'Assignment already exists',
          message: 'User already has an active assignment with this role in the study',
        });
        return;
      }

      const assignmentData = {
        study_id: studyId,
        user_id: validatedData.userId,
        role: validatedData.role,
        effort_percentage: validatedData.effortPercentage,
        start_date: validatedData.startDate,
        end_date: validatedData.endDate,
        is_active: true,
        created_by: req.user!.id,
      };

      const insertQuery = `
        INSERT INTO study_assignments (study_id, user_id, role, effort_percentage, start_date, end_date, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await db.query(insertQuery, Object.values(assignmentData));
      const assignment = transformers.transformRow(result.rows[0]);

      // Create audit log
      await auditLog(
        req.user!.id,
        'CREATE',
        'StudyAssignment',
        assignment.id,
        null,
        assignment,
        req.ip,
        req.get('User-Agent'),
        req.sessionId
      );

      logger.info('Study assignment created', {
        assignmentId: assignment.id,
        studyId,
        userId: validatedData.userId,
        role: validatedData.role,
        createdBy: req.user!.id,
      });

      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request data',
          details: error.errors,
        });
        return;
      }

      logger.error('Failed to create study assignment', {
        error: error instanceof Error ? error.message : error,
        studyId: req.params.id,
        userId: req.user?.id,
        body: req.body,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create study assignment',
      });
    }
  }

  /**
   * List study assignments
   */
  static async listByStudy(req: Request, res: Response): Promise<void> {
    try {
      const studyId = UUIDSchema.parse(req.params.id);

      const query = `
        SELECT
          sa.*,
          u.first_name,
          u.last_name,
          u.email,
          u.title,
          u.department,
          u.role as user_role
        FROM study_assignments sa
        JOIN users u ON sa.user_id = u.id
        WHERE sa.study_id = $1 AND sa.is_active = true
        ORDER BY sa.created_at DESC
      `;

      const result = await db.query(query, [studyId]);
      const assignments = result.rows.map(row => ({
        ...transformers.transformRow(row),
        user: {
          id: row.user_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          title: row.title,
          department: row.department,
          role: row.user_role,
        },
      }));

      res.json({ data: assignments });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid study ID',
          message: 'Study ID must be a valid UUID',
        });
        return;
      }

      logger.error('Failed to list study assignments', {
        error: error instanceof Error ? error.message : error,
        studyId: req.params.id,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve study assignments',
      });
    }
  }

  /**
   * Update study assignment
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const assignmentId = UUIDSchema.parse(req.params.assignmentId);
      const { effortPercentage, startDate, endDate, isActive } = req.body;

      // Get current assignment for audit trail
      const currentQuery = 'SELECT * FROM study_assignments WHERE id = $1';
      const currentResult = await db.query(currentQuery, [assignmentId]);

      if (currentResult.rows.length === 0) {
        res.status(404).json({
          error: 'Assignment not found',
          message: `Assignment with ID ${assignmentId} does not exist`,
        });
        return;
      }

      const currentAssignment = transformers.transformRow(currentResult.rows[0]);

      const updateData: any = {};
      if (effortPercentage !== undefined) updateData.effort_percentage = effortPercentage;
      if (startDate !== undefined) updateData.start_date = startDate;
      if (endDate !== undefined) updateData.end_date = endDate;
      if (isActive !== undefined) updateData.is_active = isActive;

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          error: 'No updates provided',
          message: 'At least one field must be provided for update',
        });
        return;
      }

      const setClause = Object.keys(updateData)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      const updateQuery = `
        UPDATE study_assignments
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await db.query(updateQuery, [assignmentId, ...Object.values(updateData)]);
      const updatedAssignment = transformers.transformRow(result.rows[0]);

      // Create audit log
      await auditLog(
        req.user!.id,
        'UPDATE',
        'StudyAssignment',
        assignmentId,
        currentAssignment,
        updatedAssignment,
        req.ip,
        req.get('User-Agent'),
        req.sessionId
      );

      logger.info('Study assignment updated', {
        assignmentId,
        changes: Object.keys(updateData),
        updatedBy: req.user!.id,
      });

      res.json(updatedAssignment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid assignment ID',
          message: 'Assignment ID must be a valid UUID',
        });
        return;
      }

      logger.error('Failed to update study assignment', {
        error: error instanceof Error ? error.message : error,
        assignmentId: req.params.assignmentId,
        userId: req.user?.id,
        body: req.body,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update study assignment',
      });
    }
  }

  /**
   * Delete (deactivate) study assignment
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const assignmentId = UUIDSchema.parse(req.params.assignmentId);

      // Get current assignment for audit trail
      const currentQuery = 'SELECT * FROM study_assignments WHERE id = $1 AND is_active = true';
      const currentResult = await db.query(currentQuery, [assignmentId]);

      if (currentResult.rows.length === 0) {
        res.status(404).json({
          error: 'Assignment not found',
          message: `Active assignment with ID ${assignmentId} does not exist`,
        });
        return;
      }

      const currentAssignment = transformers.transformRow(currentResult.rows[0]);

      // Deactivate assignment
      const updateQuery = `
        UPDATE study_assignments
        SET is_active = false, end_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await db.query(updateQuery, [assignmentId]);
      const updatedAssignment = transformers.transformRow(result.rows[0]);

      // Create audit log
      await auditLog(
        req.user!.id,
        'DELETE',
        'StudyAssignment',
        assignmentId,
        currentAssignment,
        updatedAssignment,
        req.ip,
        req.get('User-Agent'),
        req.sessionId
      );

      logger.info('Study assignment deleted', {
        assignmentId,
        deletedBy: req.user!.id,
      });

      res.status(204).send();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid assignment ID',
          message: 'Assignment ID must be a valid UUID',
        });
        return;
      }

      logger.error('Failed to delete study assignment', {
        error: error instanceof Error ? error.message : error,
        assignmentId: req.params.assignmentId,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete study assignment',
      });
    }
  }
}