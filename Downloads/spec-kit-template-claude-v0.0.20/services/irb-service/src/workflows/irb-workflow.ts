import {
  IRBSubmission,
  IRBSubmissionStatus,
  IRBDecision,
  IRBReviewType,
  NotificationTrigger
} from '@research-study/shared';
import { IRBSubmissionService } from '../services/irb-submission.service';
import { IRBReviewService } from '../services/irb-review.service';
import { NotificationService } from '../notifications/notification-service';
import { transaction } from '../utils/database';
import { logger } from '@research-study/shared';

export class IRBWorkflowService {
  constructor(
    private irbSubmissionService: IRBSubmissionService,
    private irbReviewService: IRBReviewService,
    private notificationService: NotificationService
  ) {}

  // Submit IRB for review - transitions from DRAFT to SUBMITTED
  async submitForReview(submissionId: string, userId: string): Promise<IRBSubmission> {
    return transaction(async (client) => {
      // Update submission status
      const updatedSubmission = await this.irbSubmissionService.updateSubmission(submissionId, {
        status: IRBSubmissionStatus.SUBMITTED,
        submittedAt: new Date()
      });

      // Trigger automatic reviewer assignment based on review type
      if (updatedSubmission.reviewType === IRBReviewType.EXPEDITED) {
        await this.autoAssignExpeditedReviewers(submissionId);
      } else if (updatedSubmission.reviewType === IRBReviewType.EXEMPT) {
        await this.processExemptSubmission(submissionId);
      }

      // Send notifications
      await this.notificationService.sendNotification(
        NotificationTrigger.IRB_SUBMISSION_RECEIVED,
        {
          submissionId,
          studyId: updatedSubmission.studyId,
          title: updatedSubmission.title,
          submissionType: updatedSubmission.submissionType
        }
      );

      logger.info(`IRB submission ${submissionId} submitted for review`);
      return updatedSubmission;
    });
  }

  // Assign reviewers - transitions to UNDER_REVIEW
  async assignReviewers(
    submissionId: string,
    assignment: {
      reviewers: string[];
      primaryReviewerId?: string;
      secondaryReviewerId?: string;
      dueDate?: Date;
    },
    assignedBy: string
  ): Promise<IRBSubmission> {
    return transaction(async (client) => {
      // Update submission with reviewer assignments
      const updatedSubmission = await this.irbSubmissionService.updateSubmission(submissionId, {
        status: IRBSubmissionStatus.UNDER_REVIEW,
        assignedReviewers: assignment.reviewers,
        primaryReviewerId: assignment.primaryReviewerId,
        secondaryReviewerId: assignment.secondaryReviewerId,
        dueDate: assignment.dueDate
      });

      // Create review records for each assigned reviewer
      await this.createReviewRecords(submissionId, assignment);

      // Calculate and set continuing review schedule if initial approval
      if (updatedSubmission.submissionType === 'INITIAL') {
        await this.scheduleContinuingReview(submissionId);
      }

      // Send notifications to assigned reviewers
      for (const reviewerId of assignment.reviewers) {
        await this.notificationService.sendNotificationToUser(
          reviewerId,
          'IRB_REVIEW_ASSIGNED',
          {
            submissionId,
            title: updatedSubmission.title,
            dueDate: assignment.dueDate
          }
        );
      }

      logger.info(`Reviewers assigned to IRB submission ${submissionId}`);
      return updatedSubmission;
    });
  }

  // Make IRB decision
  async makeDecision(
    submissionId: string,
    decision: {
      decision: IRBDecision;
      conditions?: string[];
      modifications?: string[];
      approvalExpirationDate?: Date;
    },
    decidedBy: string
  ): Promise<IRBSubmission> {
    return transaction(async (client) => {
      const newStatus = this.getStatusFromDecision(decision.decision);

      const updatedSubmission = await this.irbSubmissionService.updateSubmission(submissionId, {
        status: newStatus,
        decision: decision.decision,
        decisionDate: new Date(),
        conditions: decision.conditions || [],
        modifications: decision.modifications || [],
        approvalExpirationDate: decision.approvalExpirationDate,
        reviewedAt: new Date()
      });

      // Handle post-decision actions
      await this.handlePostDecisionActions(updatedSubmission, decision.decision);

      // Send decision notifications
      const triggerEvent = decision.decision === IRBDecision.APPROVED ||
                          decision.decision === IRBDecision.APPROVED_WITH_CONDITIONS
        ? NotificationTrigger.IRB_APPROVAL
        : NotificationTrigger.IRB_REJECTION;

      await this.notificationService.sendNotification(
        triggerEvent,
        {
          submissionId,
          studyId: updatedSubmission.studyId,
          title: updatedSubmission.title,
          decision: decision.decision,
          conditions: decision.conditions,
          modifications: decision.modifications
        }
      );

      logger.info(`IRB decision made for submission ${submissionId}: ${decision.decision}`);
      return updatedSubmission;
    });
  }

  // Withdraw submission
  async withdrawSubmission(
    submissionId: string,
    reason: string,
    withdrawnBy: string
  ): Promise<IRBSubmission> {
    return transaction(async (client) => {
      const updatedSubmission = await this.irbSubmissionService.updateSubmission(submissionId, {
        status: IRBSubmissionStatus.WITHDRAWN,
        reviewedAt: new Date()
      });

      // Cancel any pending reviews
      await this.irbReviewService.cancelPendingReviews(submissionId);

      // Send withdrawal notifications
      await this.notificationService.sendNotification(
        'IRB_SUBMISSION_WITHDRAWN' as NotificationTrigger,
        {
          submissionId,
          studyId: updatedSubmission.studyId,
          title: updatedSubmission.title,
          reason
        }
      );

      logger.info(`IRB submission ${submissionId} withdrawn: ${reason}`);
      return updatedSubmission;
    });
  }

  // Process continuing review
  async processContinuingReview(submissionId: string): Promise<void> {
    const submission = await this.irbSubmissionService.getSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    // Check if continuing review is due
    const now = new Date();
    if (submission.nextReviewDue && submission.nextReviewDue <= now) {
      // Create continuing review submission
      await this.createContinuingReviewSubmission(submission);

      // Send notifications
      await this.notificationService.sendNotification(
        NotificationTrigger.CONTINUING_REVIEW_DUE,
        {
          submissionId,
          studyId: submission.studyId,
          title: submission.title,
          dueDate: submission.nextReviewDue
        }
      );
    }
  }

  // Private helper methods
  private async autoAssignExpeditedReviewers(submissionId: string): Promise<void> {
    // Get available expedited reviewers (this would be configurable)
    const availableReviewers = await this.getAvailableExpeditedReviewers();

    if (availableReviewers.length >= 1) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7 days for expedited review

      await this.assignReviewers(
        submissionId,
        {
          reviewers: [availableReviewers[0]],
          primaryReviewerId: availableReviewers[0],
          dueDate
        },
        'SYSTEM'
      );
    }
  }

  private async processExemptSubmission(submissionId: string): Promise<void> {
    // Exempt submissions may be automatically approved based on category
    const submission = await this.irbSubmissionService.getSubmissionById(submissionId);
    if (!submission) return;

    // Auto-approve certain exempt categories
    const autoApproveCategories = ['1', '2', '4']; // Configurable
    const hasAutoApproveCategory = submission.expeditedCategory?.some(cat =>
      autoApproveCategories.includes(cat)
    );

    if (hasAutoApproveCategory) {
      await this.makeDecision(
        submissionId,
        {
          decision: IRBDecision.APPROVED,
          approvalExpirationDate: this.calculateExpirationDate(submission)
        },
        'SYSTEM'
      );
    }
  }

  private async createReviewRecords(
    submissionId: string,
    assignment: {
      reviewers: string[];
      primaryReviewerId?: string;
      secondaryReviewerId?: string;
    }
  ): Promise<void> {
    for (const reviewerId of assignment.reviewers) {
      let reviewType: 'PRIMARY' | 'SECONDARY' | 'MEMBER' = 'MEMBER';

      if (reviewerId === assignment.primaryReviewerId) {
        reviewType = 'PRIMARY';
      } else if (reviewerId === assignment.secondaryReviewerId) {
        reviewType = 'SECONDARY';
      }

      await this.irbReviewService.createReview({
        submissionId,
        reviewerId,
        reviewType,
        status: 'ASSIGNED',
        recommendation: 'APPROVE' // Default, will be updated by reviewer
      });
    }
  }

  private async scheduleContinuingReview(submissionId: string): Promise<void> {
    const submission = await this.irbSubmissionService.getSubmissionById(submissionId);
    if (!submission) return;

    // Calculate next review date (typically 1 year for most studies)
    const nextReviewDue = new Date();
    nextReviewDue.setFullYear(nextReviewDue.getFullYear() + 1);

    await this.irbSubmissionService.updateSubmission(submissionId, {
      nextReviewDue,
      issueContinuingReview: true
    });
  }

  private getStatusFromDecision(decision: IRBDecision): IRBSubmissionStatus {
    switch (decision) {
      case IRBDecision.APPROVED:
        return IRBSubmissionStatus.APPROVED;
      case IRBDecision.APPROVED_WITH_CONDITIONS:
        return IRBSubmissionStatus.APPROVED_WITH_CONDITIONS;
      case IRBDecision.DISAPPROVED:
        return IRBSubmissionStatus.DISAPPROVED;
      case IRBDecision.DEFERRED:
      case IRBDecision.TABLED:
      case IRBDecision.REQUIRES_MODIFICATIONS:
        return IRBSubmissionStatus.PENDING_CLARIFICATION;
      default:
        return IRBSubmissionStatus.UNDER_REVIEW;
    }
  }

  private async handlePostDecisionActions(
    submission: IRBSubmission,
    decision: IRBDecision
  ): Promise<void> {
    if (decision === IRBDecision.APPROVED || decision === IRBDecision.APPROVED_WITH_CONDITIONS) {
      // Update study status if this is an initial approval
      if (submission.submissionType === 'INITIAL') {
        await this.updateStudyStatusToApproved(submission.studyId);
      }

      // Schedule continuing review
      if (!submission.nextReviewDue) {
        await this.scheduleContinuingReview(submission.id);
      }
    }
  }

  private async createContinuingReviewSubmission(parentSubmission: IRBSubmission): Promise<void> {
    // Create a new continuing review submission
    const submissionNumber = await this.irbSubmissionService.generateSubmissionNumber(
      parentSubmission.studyId,
      'CONTINUING_REVIEW'
    );

    await this.irbSubmissionService.createSubmission({
      studyId: parentSubmission.studyId,
      submissionType: 'CONTINUING_REVIEW',
      status: IRBSubmissionStatus.DRAFT,
      submissionNumber,
      title: `Continuing Review: ${parentSubmission.title}`,
      description: `Continuing review for IRB submission ${parentSubmission.submissionNumber}`,
      submittedBy: parentSubmission.submittedBy,
      reviewType: IRBReviewType.FULL_BOARD,
      assignedReviewers: [],
      documentIds: []
    });
  }

  private calculateExpirationDate(submission: IRBSubmission): Date {
    const expiration = new Date();

    // Different expiration periods based on risk level
    if (submission.reviewType === IRBReviewType.EXEMPT) {
      expiration.setFullYear(expiration.getFullYear() + 3); // 3 years for exempt
    } else {
      expiration.setFullYear(expiration.getFullYear() + 1); // 1 year for others
    }

    return expiration;
  }

  private async getAvailableExpeditedReviewers(): Promise<string[]> {
    // This would query for available reviewers with expedited review permissions
    // For now, return a mock list
    return ['reviewer1-uuid', 'reviewer2-uuid'];
  }

  private async updateStudyStatusToApproved(studyId: string): Promise<void> {
    // This would update the study status in the study management service
    // For now, just log the action
    logger.info(`Study ${studyId} approved by IRB`);
  }
}