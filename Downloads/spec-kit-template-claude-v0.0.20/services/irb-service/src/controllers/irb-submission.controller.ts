import { Request, Response } from 'express';
import { IRBSubmissionService } from '../services/irb-submission.service';
import { IRBWorkflowService } from '../workflows/irb-workflow';
import {
  IRBSubmission,
  IRBSubmissionType,
  IRBReviewType,
  IRBSubmissionStatus
} from '@research-study/shared';
import { logger } from '@research-study/shared';
import { logAudit } from '../utils/database';

export class IRBSubmissionController {
  constructor(
    private irbSubmissionService: IRBSubmissionService,
    private irbWorkflowService: IRBWorkflowService
  ) {}

  // Create new IRB submission
  public createSubmission = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const {
        studyId,
        submissionType,
        title,
        description,
        reviewType,
        expeditedCategory
      } = req.body;

      // Validate required fields
      if (!studyId || !submissionType || !title || !reviewType) {
        res.status(400).json({
          error: 'Missing required fields: studyId, submissionType, title, reviewType'
        });
        return;
      }

      // Generate submission number
      const submissionNumber = await this.irbSubmissionService.generateSubmissionNumber(
        studyId,
        submissionType
      );

      const submissionData = {
        studyId,
        submissionType: submissionType as IRBSubmissionType,
        status: IRBSubmissionStatus.DRAFT,
        submissionNumber,
        title,
        description,
        submittedBy: userId,
        reviewType: reviewType as IRBReviewType,
        expeditedCategory,
        assignedReviewers: [],
        documentIds: [],
        conditions: [],
        modifications: []
      };

      const submission = await this.irbSubmissionService.createSubmission(submissionData);

      await logAudit(
        userId,
        'CREATE_IRB_SUBMISSION',
        'IRBSubmission',
        submission.id,
        null,
        submission,
        {
          studyId,
          submissionId: submission.id,
          riskLevel: 'MEDIUM'
        }
      );

      res.status(201).json(submission);
    } catch (error) {
      logger.error('Error creating IRB submission:', error);
      res.status(500).json({ error: 'Failed to create IRB submission' });
    }
  };

  // Get submission by ID
  public getSubmission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const submission = await this.irbSubmissionService.getSubmissionById(id);

      if (!submission) {
        res.status(404).json({ error: 'IRB submission not found' });
        return;
      }

      res.json(submission);
    } catch (error) {
      logger.error('Error retrieving IRB submission:', error);
      res.status(500).json({ error: 'Failed to retrieve IRB submission' });
    }
  };

  // Get submissions by study
  public getSubmissionsByStudy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const { status, submissionType, page = 1, limit = 10 } = req.query;

      const filters = {
        studyId,
        status: status as IRBSubmissionStatus,
        submissionType: submissionType as IRBSubmissionType
      };

      const result = await this.irbSubmissionService.getSubmissionsByStudy(
        filters,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.json(result);
    } catch (error) {
      logger.error('Error retrieving submissions by study:', error);
      res.status(500).json({ error: 'Failed to retrieve submissions' });
    }
  };

  // Update submission
  public updateSubmission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      const currentSubmission = await this.irbSubmissionService.getSubmissionById(id);
      if (!currentSubmission) {
        res.status(404).json({ error: 'IRB submission not found' });
        return;
      }

      // Check if user can update this submission
      if (currentSubmission.submittedBy !== userId && !['ADMIN', 'PRINCIPAL_INVESTIGATOR'].includes(req.user!.role)) {
        res.status(403).json({ error: 'Not authorized to update this submission' });
        return;
      }

      // Prevent updates to submitted submissions unless admin
      if (currentSubmission.status !== IRBSubmissionStatus.DRAFT && !['ADMIN'].includes(req.user!.role)) {
        res.status(400).json({ error: 'Cannot update submission after submission' });
        return;
      }

      const updatedSubmission = await this.irbSubmissionService.updateSubmission(id, updateData);

      await logAudit(
        userId,
        'UPDATE_IRB_SUBMISSION',
        'IRBSubmission',
        id,
        currentSubmission,
        updatedSubmission,
        {
          studyId: currentSubmission.studyId,
          submissionId: id,
          riskLevel: 'MEDIUM'
        }
      );

      res.json(updatedSubmission);
    } catch (error) {
      logger.error('Error updating IRB submission:', error);
      res.status(500).json({ error: 'Failed to update IRB submission' });
    }
  };

  // Submit IRB submission for review
  public submitForReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const submission = await this.irbSubmissionService.getSubmissionById(id);
      if (!submission) {
        res.status(404).json({ error: 'IRB submission not found' });
        return;
      }

      // Check authorization
      if (submission.submittedBy !== userId && !['ADMIN', 'PRINCIPAL_INVESTIGATOR'].includes(req.user!.role)) {
        res.status(403).json({ error: 'Not authorized to submit this submission' });
        return;
      }

      // Validate submission is ready
      const validationResult = await this.irbSubmissionService.validateSubmissionForReview(id);
      if (!validationResult.isValid) {
        res.status(400).json({
          error: 'Submission not ready for review',
          issues: validationResult.issues
        });
        return;
      }

      // Process submission through workflow
      const updatedSubmission = await this.irbWorkflowService.submitForReview(id, userId);

      await logAudit(
        userId,
        'SUBMIT_IRB_FOR_REVIEW',
        'IRBSubmission',
        id,
        submission,
        updatedSubmission,
        {
          studyId: submission.studyId,
          submissionId: id,
          riskLevel: 'HIGH'
        }
      );

      res.json(updatedSubmission);
    } catch (error) {
      logger.error('Error submitting IRB for review:', error);
      res.status(500).json({ error: 'Failed to submit IRB for review' });
    }
  };

  // Assign reviewers
  public assignReviewers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reviewers, primaryReviewerId, secondaryReviewerId, dueDate } = req.body;
      const userId = req.user!.id;

      // Check authorization - only IRB administrators can assign reviewers
      if (!['ADMIN'].includes(req.user!.role)) {
        res.status(403).json({ error: 'Not authorized to assign reviewers' });
        return;
      }

      const submission = await this.irbSubmissionService.getSubmissionById(id);
      if (!submission) {
        res.status(404).json({ error: 'IRB submission not found' });
        return;
      }

      const updatedSubmission = await this.irbWorkflowService.assignReviewers(
        id,
        {
          reviewers,
          primaryReviewerId,
          secondaryReviewerId,
          dueDate: dueDate ? new Date(dueDate) : undefined
        },
        userId
      );

      await logAudit(
        userId,
        'ASSIGN_IRB_REVIEWERS',
        'IRBSubmission',
        id,
        submission,
        updatedSubmission,
        {
          studyId: submission.studyId,
          submissionId: id,
          riskLevel: 'MEDIUM'
        }
      );

      res.json(updatedSubmission);
    } catch (error) {
      logger.error('Error assigning reviewers:', error);
      res.status(500).json({ error: 'Failed to assign reviewers' });
    }
  };

  // Make IRB decision
  public makeDecision = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { decision, conditions, modifications, approvalExpirationDate } = req.body;
      const userId = req.user!.id;

      // Check authorization
      if (!['ADMIN'].includes(req.user!.role)) {
        res.status(403).json({ error: 'Not authorized to make IRB decisions' });
        return;
      }

      const submission = await this.irbSubmissionService.getSubmissionById(id);
      if (!submission) {
        res.status(404).json({ error: 'IRB submission not found' });
        return;
      }

      const updatedSubmission = await this.irbWorkflowService.makeDecision(
        id,
        {
          decision,
          conditions,
          modifications,
          approvalExpirationDate: approvalExpirationDate ? new Date(approvalExpirationDate) : undefined
        },
        userId
      );

      await logAudit(
        userId,
        'MAKE_IRB_DECISION',
        'IRBSubmission',
        id,
        submission,
        updatedSubmission,
        {
          studyId: submission.studyId,
          submissionId: id,
          riskLevel: 'CRITICAL'
        }
      );

      res.json(updatedSubmission);
    } catch (error) {
      logger.error('Error making IRB decision:', error);
      res.status(500).json({ error: 'Failed to make IRB decision' });
    }
  };

  // Withdraw submission
  public withdrawSubmission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user!.id;

      const submission = await this.irbSubmissionService.getSubmissionById(id);
      if (!submission) {
        res.status(404).json({ error: 'IRB submission not found' });
        return;
      }

      // Check authorization
      if (submission.submittedBy !== userId && !['ADMIN'].includes(req.user!.role)) {
        res.status(403).json({ error: 'Not authorized to withdraw this submission' });
        return;
      }

      const updatedSubmission = await this.irbWorkflowService.withdrawSubmission(id, reason, userId);

      await logAudit(
        userId,
        'WITHDRAW_IRB_SUBMISSION',
        'IRBSubmission',
        id,
        submission,
        updatedSubmission,
        {
          studyId: submission.studyId,
          submissionId: id,
          riskLevel: 'HIGH'
        }
      );

      res.json(updatedSubmission);
    } catch (error) {
      logger.error('Error withdrawing IRB submission:', error);
      res.status(500).json({ error: 'Failed to withdraw IRB submission' });
    }
  };

  // Get dashboard data
  public getDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const dashboard = await this.irbSubmissionService.getDashboardData(userId, userRole);

      res.json(dashboard);
    } catch (error) {
      logger.error('Error retrieving IRB dashboard:', error);
      res.status(500).json({ error: 'Failed to retrieve dashboard data' });
    }
  };
}