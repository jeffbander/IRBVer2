import {
  IRBSubmission,
  IRBSubmissionType,
  IRBSubmissionStatus,
  IRBReviewType
} from '@research-study/shared';
import { query, transaction } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';

export class IRBSubmissionService {
  // Create new IRB submission
  async createSubmission(data: Partial<IRBSubmission>): Promise<IRBSubmission> {
    const id = uuidv4();
    const now = new Date();

    const result = await query(
      `INSERT INTO irb_submissions (
        id, study_id, submission_type, status, submission_number, title, description,
        submitted_by, review_type, expedited_category, assigned_reviewers,
        document_ids, conditions, modifications, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id,
        data.studyId,
        data.submissionType,
        data.status,
        data.submissionNumber,
        data.title,
        data.description,
        data.submittedBy,
        data.reviewType,
        data.expeditedCategory || [],
        data.assignedReviewers || [],
        data.documentIds || [],
        data.conditions || [],
        data.modifications || [],
        now,
        now
      ]
    );

    return this.mapRowToSubmission(result.rows[0]);
  }

  // Get submission by ID
  async getSubmissionById(id: string): Promise<IRBSubmission | null> {
    const result = await query(
      'SELECT * FROM irb_submissions WHERE id = $1',
      [id]
    );

    return result.rows[0] ? this.mapRowToSubmission(result.rows[0]) : null;
  }

  // Get submissions by study with filters
  async getSubmissionsByStudy(
    filters: {
      studyId: string;
      status?: IRBSubmissionStatus;
      submissionType?: IRBSubmissionType;
    },
    pagination: { page: number; limit: number }
  ): Promise<{ submissions: IRBSubmission[]; total: number; page: number; limit: number }> {
    let whereClause = 'WHERE study_id = $1';
    const params: any[] = [filters.studyId];
    let paramIndex = 2;

    if (filters.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.submissionType) {
      whereClause += ` AND submission_type = $${paramIndex}`;
      params.push(filters.submissionType);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM irb_submissions ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const offset = (pagination.page - 1) * pagination.limit;
    const dataResult = await query(
      `SELECT * FROM irb_submissions ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pagination.limit, offset]
    );

    const submissions = dataResult.rows.map(row => this.mapRowToSubmission(row));

    return {
      submissions,
      total,
      page: pagination.page,
      limit: pagination.limit
    };
  }

  // Update submission
  async updateSubmission(id: string, data: Partial<IRBSubmission>): Promise<IRBSubmission> {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    const updateableFields = [
      'title', 'description', 'review_type', 'expedited_category',
      'assigned_reviewers', 'primary_reviewer_id', 'secondary_reviewer_id',
      'due_date', 'decision', 'decision_date', 'approval_expiration_date',
      'conditions', 'modifications', 'irb_meeting_id', 'meeting_date',
      'next_review_due', 'issue_continuing_review', 'document_ids', 'status'
    ];

    for (const field of updateableFields) {
      const camelField = this.snakeToCamel(field);
      if (data[camelField] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        params.push(data[camelField]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      // No fields to update, return current submission
      return this.getSubmissionById(id)!;
    }

    updateFields.push(`updated_at = $${paramIndex}`);
    params.push(new Date());
    paramIndex++;

    params.push(id); // Add ID for WHERE clause

    const result = await query(
      `UPDATE irb_submissions SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return this.mapRowToSubmission(result.rows[0]);
  }

  // Generate submission number
  async generateSubmissionNumber(studyId: string, submissionType: IRBSubmissionType): Promise<string> {
    const year = new Date().getFullYear();
    const typePrefix = this.getTypePrefix(submissionType);

    // Get count of submissions for this study and type this year
    const result = await query(
      `SELECT COUNT(*) FROM irb_submissions
       WHERE study_id = $1 AND submission_type = $2
       AND EXTRACT(YEAR FROM created_at) = $3`,
      [studyId, submissionType, year]
    );

    const count = parseInt(result.rows[0].count) + 1;
    const sequence = count.toString().padStart(3, '0');

    return `${typePrefix}-${year}-${studyId.substring(0, 8)}-${sequence}`;
  }

  // Validate submission for review
  async validateSubmissionForReview(id: string): Promise<{ isValid: boolean; issues: string[] }> {
    const submission = await this.getSubmissionById(id);
    if (!submission) {
      return { isValid: false, issues: ['Submission not found'] };
    }

    const issues: string[] = [];

    // Check submission status
    if (submission.status !== IRBSubmissionStatus.DRAFT) {
      issues.push('Submission must be in DRAFT status');
    }

    // Check required documents
    if (submission.documentIds.length === 0) {
      issues.push('At least one document must be attached');
    }

    // Validate required documents based on submission type
    if (submission.submissionType === IRBSubmissionType.INITIAL) {
      const hasProtocol = await this.hasRequiredDocument(submission.documentIds, 'PROTOCOL');
      if (!hasProtocol) {
        issues.push('Initial submission requires a protocol document');
      }

      const hasConsentForm = await this.hasRequiredDocument(submission.documentIds, 'INFORMED_CONSENT');
      if (!hasConsentForm) {
        issues.push('Initial submission requires an informed consent form');
      }
    }

    // Check expedited categories for expedited review
    if (submission.reviewType === IRBReviewType.EXPEDITED) {
      if (!submission.expeditedCategory || submission.expeditedCategory.length === 0) {
        issues.push('Expedited review requires at least one expedited category');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // Get all submissions (admin only)
  async getAllSubmissions(
    filters: { status?: string; submissionType?: string },
    pagination: { page: number; limit: number }
  ): Promise<any> {
    // Implementation for admin to get all submissions
    return { submissions: [], total: 0, page: pagination.page, limit: pagination.limit };
  }

  // Get metrics for admin dashboard
  async getMetrics(options: { startDate?: Date; endDate?: Date }): Promise<any> {
    // Implementation for IRB metrics
    return {};
  }

  // Get dashboard data
  async getDashboardData(userId: string, userRole: string): Promise<any> {
    const dashboard: any = {
      mySubmissions: {},
      pendingReviews: {},
      recentActivity: [],
      upcomingDeadlines: []
    };

    // Get user's submissions summary
    if (['PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR'].includes(userRole)) {
      const submissionsResult = await query(
        `SELECT status, COUNT(*) as count
         FROM irb_submissions
         WHERE submitted_by = $1
         GROUP BY status`,
        [userId]
      );

      dashboard.mySubmissions = submissionsResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {});
    }

    // Get pending reviews for reviewers/admins
    if (['ADMIN'].includes(userRole) || await this.isReviewer(userId)) {
      const reviewsResult = await query(
        `SELECT COUNT(*) as count
         FROM irb_submissions s
         JOIN irb_reviews r ON s.id = r.submission_id
         WHERE r.reviewer_id = $1 AND r.status IN ('ASSIGNED', 'IN_PROGRESS')`,
        [userId]
      );

      dashboard.pendingReviews.count = parseInt(reviewsResult.rows[0]?.count || '0');
    }

    // Get recent activity
    const activityResult = await query(
      `SELECT s.id, s.title, s.status, s.submission_type, s.updated_at
       FROM irb_submissions s
       WHERE s.submitted_by = $1 OR s.id IN (
         SELECT submission_id FROM irb_reviews WHERE reviewer_id = $1
       )
       ORDER BY s.updated_at DESC
       LIMIT 10`,
      [userId]
    );

    dashboard.recentActivity = activityResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      status: row.status,
      submissionType: row.submission_type,
      updatedAt: row.updated_at
    }));

    // Get upcoming deadlines
    const deadlinesResult = await query(
      `SELECT s.id, s.title, s.due_date, s.next_review_due
       FROM irb_submissions s
       LEFT JOIN irb_reviews r ON s.id = r.submission_id
       WHERE (s.submitted_by = $1 OR r.reviewer_id = $1)
       AND (s.due_date > NOW() OR s.next_review_due > NOW())
       ORDER BY COALESCE(s.due_date, s.next_review_due) ASC
       LIMIT 5`,
      [userId]
    );

    dashboard.upcomingDeadlines = deadlinesResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      dueDate: row.due_date || row.next_review_due,
      type: row.due_date ? 'review' : 'continuing_review'
    }));

    return dashboard;
  }

  // Helper methods
  private mapRowToSubmission(row: any): IRBSubmission {
    return {
      id: row.id,
      studyId: row.study_id,
      submissionType: row.submission_type,
      status: row.status,
      submissionNumber: row.submission_number,
      title: row.title,
      description: row.description,
      submittedBy: row.submitted_by,
      submittedAt: row.submitted_at,
      reviewType: row.review_type,
      expeditedCategory: row.expedited_category,
      assignedReviewers: row.assigned_reviewers,
      primaryReviewerId: row.primary_reviewer_id,
      secondaryReviewerId: row.secondary_reviewer_id,
      dueDate: row.due_date,
      reviewedAt: row.reviewed_at,
      decision: row.decision,
      decisionDate: row.decision_date,
      approvalExpirationDate: row.approval_expiration_date,
      conditions: row.conditions,
      modifications: row.modifications,
      irbMeetingId: row.irb_meeting_id,
      meetingDate: row.meeting_date,
      nextReviewDue: row.next_review_due,
      issueContinuingReview: row.issue_continuing_review,
      documentIds: row.document_ids,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private getTypePrefix(type: IRBSubmissionType): string {
    const prefixes = {
      [IRBSubmissionType.INITIAL]: 'IRB',
      [IRBSubmissionType.AMENDMENT]: 'AMD',
      [IRBSubmissionType.CONTINUING_REVIEW]: 'CR',
      [IRBSubmissionType.REPORTABLE_EVENT]: 'RPT',
      [IRBSubmissionType.STUDY_CLOSURE]: 'CLS',
      [IRBSubmissionType.EMERGENCY_USE]: 'EMG'
    };
    return prefixes[type];
  }

  private async hasRequiredDocument(documentIds: string[], documentType: string): Promise<boolean> {
    if (documentIds.length === 0) return false;

    const result = await query(
      `SELECT COUNT(*) FROM irb_documents
       WHERE id = ANY($1) AND document_type = $2 AND status IN ('APPROVED', 'DRAFT')`,
      [documentIds, documentType]
    );

    return parseInt(result.rows[0].count) > 0;
  }

  private async isReviewer(userId: string): Promise<boolean> {
    const result = await query(
      'SELECT COUNT(*) FROM irb_reviews WHERE reviewer_id = $1',
      [userId]
    );

    return parseInt(result.rows[0].count) > 0;
  }
}