import {
  IRBReview,
  IRBReviewStatus,
  IRBReviewRecommendation
} from '@research-study/shared';
import { query, transaction } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';

export class IRBReviewService {
  // Create new review
  async createReview(data: Partial<IRBReview>): Promise<IRBReview> {
    const id = uuidv4();
    const now = new Date();

    const result = await query(
      `INSERT INTO irb_reviews (
        id, submission_id, reviewer_id, review_type, status,
        scientific_merit, risk_assessment, benefit_assessment,
        comments, recommendations, concerns, recommendation,
        submitted_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id,
        data.submissionId,
        data.reviewerId,
        data.reviewType,
        data.status || IRBReviewStatus.ASSIGNED,
        data.scientificMerit,
        data.riskAssessment,
        data.benefitAssessment,
        data.comments,
        data.recommendations || [],
        data.concerns || [],
        data.recommendation,
        data.submittedAt,
        now,
        now
      ]
    );

    return this.mapRowToReview(result.rows[0]);
  }

  // Get review by ID
  async getReviewById(id: string): Promise<IRBReview | null> {
    const result = await query(
      'SELECT * FROM irb_reviews WHERE id = $1',
      [id]
    );

    return result.rows[0] ? this.mapRowToReview(result.rows[0]) : null;
  }

  // Get reviews by reviewer
  async getReviewsByReviewer(
    reviewerId: string,
    status?: string,
    pagination?: { page: number; limit: number }
  ): Promise<{ reviews: IRBReview[]; total: number }> {
    let whereClause = 'WHERE reviewer_id = $1';
    const params: any[] = [reviewerId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM irb_reviews ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get reviews with submission details
    let query_text = `
      SELECT r.*, s.title as submission_title, s.submission_number, s.study_id
      FROM irb_reviews r
      JOIN irb_submissions s ON r.submission_id = s.id
      ${whereClause}
      ORDER BY r.created_at DESC
    `;

    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query_text += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pagination.limit, offset);
    }

    const dataResult = await query(query_text, params);

    const reviews = dataResult.rows.map(row => ({
      ...this.mapRowToReview(row),
      submissionTitle: row.submission_title,
      submissionNumber: row.submission_number,
      studyId: row.study_id
    }));

    return { reviews, total };
  }

  // Get reviews by submission
  async getReviewsBySubmission(submissionId: string): Promise<IRBReview[]> {
    const result = await query(
      'SELECT * FROM irb_reviews WHERE submission_id = $1 ORDER BY created_at ASC',
      [submissionId]
    );

    return result.rows.map(row => this.mapRowToReview(row));
  }

  // Update review
  async updateReview(id: string, data: Partial<IRBReview>): Promise<IRBReview> {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const updateableFields = [
      'status', 'scientific_merit', 'risk_assessment', 'benefit_assessment',
      'comments', 'recommendations', 'concerns', 'recommendation', 'submitted_at'
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
      // No fields to update, return current review
      return this.getReviewById(id)!;
    }

    updateFields.push(`updated_at = $${paramIndex}`);
    params.push(new Date());
    paramIndex++;

    params.push(id); // Add ID for WHERE clause

    const result = await query(
      `UPDATE irb_reviews SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return this.mapRowToReview(result.rows[0]);
  }

  // Submit review (mark as completed)
  async submitReview(id: string): Promise<IRBReview> {
    return this.updateReview(id, {
      status: IRBReviewStatus.COMPLETED,
      submittedAt: new Date()
    });
  }

  // Cancel pending reviews for a submission
  async cancelPendingReviews(submissionId: string): Promise<void> {
    await query(
      `UPDATE irb_reviews
       SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
       WHERE submission_id = $1 AND status IN ('ASSIGNED', 'IN_PROGRESS')`,
      [submissionId]
    );
  }

  // Get review statistics
  async getReviewStats(reviewerId?: string): Promise<any> {
    let whereClause = '';
    const params: any[] = [];

    if (reviewerId) {
      whereClause = 'WHERE reviewer_id = $1';
      params.push(reviewerId);
    }

    const result = await query(
      `SELECT
        status,
        COUNT(*) as count,
        AVG(CASE WHEN submitted_at IS NOT NULL AND created_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (submitted_at - created_at)) / 86400
          ELSE NULL END) as avg_days_to_complete
       FROM irb_reviews
       ${whereClause}
       GROUP BY status`,
      params
    );

    const stats = result.rows.reduce((acc, row) => {
      acc[row.status] = {
        count: parseInt(row.count),
        avgDaysToComplete: row.avg_days_to_complete ? parseFloat(row.avg_days_to_complete) : null
      };
      return acc;
    }, {});

    return stats;
  }

  // Get overdue reviews
  async getOverdueReviews(): Promise<IRBReview[]> {
    const result = await query(
      `SELECT r.*, s.title as submission_title, s.submission_number, s.study_id
       FROM irb_reviews r
       JOIN irb_submissions s ON r.submission_id = s.id
       WHERE r.status IN ('ASSIGNED', 'IN_PROGRESS')
       AND s.due_date < CURRENT_DATE
       ORDER BY s.due_date ASC`
    );

    return result.rows.map(row => ({
      ...this.mapRowToReview(row),
      submissionTitle: row.submission_title,
      submissionNumber: row.submission_number,
      studyId: row.study_id
    }));
  }

  // Get review workload by reviewer
  async getReviewerWorkload(): Promise<any[]> {
    const result = await query(
      `SELECT
        reviewer_id,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 END) as pending_reviews,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_reviews,
        AVG(CASE WHEN status = 'COMPLETED' AND submitted_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (submitted_at - created_at)) / 86400
          ELSE NULL END) as avg_completion_days
       FROM irb_reviews
       GROUP BY reviewer_id
       ORDER BY pending_reviews DESC, total_reviews DESC`
    );

    return result.rows.map(row => ({
      reviewerId: row.reviewer_id,
      totalReviews: parseInt(row.total_reviews),
      pendingReviews: parseInt(row.pending_reviews),
      completedReviews: parseInt(row.completed_reviews),
      avgCompletionDays: row.avg_completion_days ? parseFloat(row.avg_completion_days) : null
    }));
  }

  // Private helper methods
  private mapRowToReview(row: any): IRBReview {
    return {
      id: row.id,
      submissionId: row.submission_id,
      reviewerId: row.reviewer_id,
      reviewType: row.review_type,
      status: row.status,
      scientificMerit: row.scientific_merit,
      riskAssessment: row.risk_assessment,
      benefitAssessment: row.benefit_assessment,
      comments: row.comments,
      recommendations: row.recommendations || [],
      concerns: row.concerns || [],
      recommendation: row.recommendation,
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}