import {
  IRBSubmission,
  IRBSubmissionStatus,
  IRBReviewPath,
  CreateIRBSubmissionRequest,
  Study,
  StudyStatus,
  User
} from '@research-study/shared';
import { db, queryBuilder, transformers, auditLog } from '../utils/database';
import { createLogger } from '@research-study/shared';

const logger = createLogger('IRBSubmissionModel');

export class IRBSubmissionModel {

  /**
   * Create a new IRB submission
   */
  static async create(
    studyId: string,
    data: CreateIRBSubmissionRequest,
    createdBy: string,
    auditContext?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<IRBSubmission> {
    // Validate that study exists and is ready for submission
    const study = await this.validateStudyForSubmission(studyId);

    // Generate submission number
    const submissionNumber = await this.generateSubmissionNumber();

    const submissionData = {
      study_id: studyId,
      submission_number: submissionNumber,
      submission_type: data.submissionType || 'INITIAL',
      review_path: data.reviewPath,
      status: IRBSubmissionStatus.DRAFT,
      submission_title: data.submissionTitle,
      submission_description: data.submissionDescription,
      review_notes: data.reviewNotes,
      created_by: createdBy,
      updated_by: createdBy,
    };

    const { query, values } = queryBuilder.insert('irb_submissions', submissionData);
    const result = await db.query(query, values);
    const submission = transformers.transformRow<IRBSubmission>(result.rows[0]);

    // Create audit log
    await auditLog(
      createdBy,
      'CREATE',
      'IRBSubmission',
      submission.id,
      null,
      submission,
      auditContext?.ipAddress,
      auditContext?.userAgent,
      auditContext?.sessionId
    );

    logger.info('IRB submission created', {
      submissionId: submission.id,
      studyId,
      submissionNumber: submission.submissionNumber
    });

    return submission;
  }

  /**
   * Submit an IRB submission
   */
  static async submit(
    id: string,
    submittedBy: string,
    auditContext?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<IRBSubmission | null> {
    const currentSubmission = await this.findById(id);
    if (!currentSubmission) {
      throw new Error('IRB submission not found');
    }

    if (currentSubmission.status !== IRBSubmissionStatus.DRAFT) {
      throw new Error(`Cannot submit IRB submission in status: ${currentSubmission.status}`);
    }

    // Validate that all required documents are present
    await this.validateSubmissionRequirements(currentSubmission.studyId);

    const updateData = {
      status: IRBSubmissionStatus.SUBMITTED,
      submitted_at: new Date(),
      updated_by: submittedBy,
    };

    const { query, values } = queryBuilder.update('irb_submissions', updateData, `id = '${id}'`);
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    const updatedSubmission = transformers.transformRow<IRBSubmission>(result.rows[0]);

    // Update study status to PENDING_APPROVAL
    await db.query(
      `UPDATE studies SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [StudyStatus.PENDING_APPROVAL, submittedBy, currentSubmission.studyId]
    );

    // Create audit log
    await auditLog(
      submittedBy,
      'SUBMIT',
      'IRBSubmission',
      id,
      currentSubmission,
      updatedSubmission,
      auditContext?.ipAddress,
      auditContext?.userAgent,
      auditContext?.sessionId
    );

    logger.info('IRB submission submitted', {
      submissionId: id,
      studyId: currentSubmission.studyId,
      submissionNumber: updatedSubmission.submissionNumber
    });

    return updatedSubmission;
  }

  /**
   * Approve an IRB submission
   */
  static async approve(
    id: string,
    approvalData: {
      irbNumber: string;
      approvalExpirationDate: Date;
      approvalConditions?: string;
    },
    approvedBy: string,
    auditContext?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<IRBSubmission | null> {
    const currentSubmission = await this.findById(id);
    if (!currentSubmission) {
      throw new Error('IRB submission not found');
    }

    if (!this.canApprove(currentSubmission.status)) {
      throw new Error(`Cannot approve IRB submission in status: ${currentSubmission.status}`);
    }

    const updateData = {
      status: IRBSubmissionStatus.APPROVED,
      irb_number: approvalData.irbNumber,
      approval_expiration_date: approvalData.approvalExpirationDate,
      approval_conditions: approvalData.approvalConditions,
      approved_at: new Date(),
      reviewed_at: new Date(),
      reviewer_id: approvedBy,
      updated_by: approvedBy,
    };

    const { query, values } = queryBuilder.update('irb_submissions', updateData, `id = '${id}'`);
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    const updatedSubmission = transformers.transformRow<IRBSubmission>(result.rows[0]);

    // Update study status to APPROVED
    await db.query(
      `UPDATE studies SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [StudyStatus.APPROVED, approvedBy, currentSubmission.studyId]
    );

    // Create audit log
    await auditLog(
      approvedBy,
      'APPROVE',
      'IRBSubmission',
      id,
      currentSubmission,
      updatedSubmission,
      auditContext?.ipAddress,
      auditContext?.userAgent,
      auditContext?.sessionId
    );

    logger.info('IRB submission approved', {
      submissionId: id,
      studyId: currentSubmission.studyId,
      irbNumber: approvalData.irbNumber
    });

    return updatedSubmission;
  }

  /**
   * Request modifications for an IRB submission
   */
  static async requestModifications(
    id: string,
    modificationNotes: string,
    reviewedBy: string,
    auditContext?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<IRBSubmission | null> {
    const currentSubmission = await this.findById(id);
    if (!currentSubmission) {
      throw new Error('IRB submission not found');
    }

    if (currentSubmission.status !== IRBSubmissionStatus.UNDER_REVIEW) {
      throw new Error(`Cannot request modifications for IRB submission in status: ${currentSubmission.status}`);
    }

    const updateData = {
      status: IRBSubmissionStatus.PENDING_MODIFICATIONS,
      review_notes: modificationNotes,
      reviewed_at: new Date(),
      reviewer_id: reviewedBy,
      updated_by: reviewedBy,
    };

    const { query, values } = queryBuilder.update('irb_submissions', updateData, `id = '${id}'`);
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    const updatedSubmission = transformers.transformRow<IRBSubmission>(result.rows[0]);

    // Update study status back to READY_TO_SUBMIT
    await db.query(
      `UPDATE studies SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [StudyStatus.READY_TO_SUBMIT, reviewedBy, currentSubmission.studyId]
    );

    // Create audit log
    await auditLog(
      reviewedBy,
      'REQUEST_MODIFICATIONS',
      'IRBSubmission',
      id,
      currentSubmission,
      updatedSubmission,
      auditContext?.ipAddress,
      auditContext?.userAgent,
      auditContext?.sessionId
    );

    logger.info('IRB submission modifications requested', {
      submissionId: id,
      studyId: currentSubmission.studyId
    });

    return updatedSubmission;
  }

  /**
   * Disapprove an IRB submission
   */
  static async disapprove(
    id: string,
    disapprovalReason: string,
    reviewedBy: string,
    auditContext?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<IRBSubmission | null> {
    const currentSubmission = await this.findById(id);
    if (!currentSubmission) {
      throw new Error('IRB submission not found');
    }

    if (!this.canDisapprove(currentSubmission.status)) {
      throw new Error(`Cannot disapprove IRB submission in status: ${currentSubmission.status}`);
    }

    const updateData = {
      status: IRBSubmissionStatus.DISAPPROVED,
      review_notes: disapprovalReason,
      reviewed_at: new Date(),
      reviewer_id: reviewedBy,
      updated_by: reviewedBy,
    };

    const { query, values } = queryBuilder.update('irb_submissions', updateData, `id = '${id}'`);
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    const updatedSubmission = transformers.transformRow<IRBSubmission>(result.rows[0]);

    // Update study status to TERMINATED
    await db.query(
      `UPDATE studies SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [StudyStatus.TERMINATED, reviewedBy, currentSubmission.studyId]
    );

    // Create audit log
    await auditLog(
      reviewedBy,
      'DISAPPROVE',
      'IRBSubmission',
      id,
      currentSubmission,
      updatedSubmission,
      auditContext?.ipAddress,
      auditContext?.userAgent,
      auditContext?.sessionId
    );

    logger.info('IRB submission disapproved', {
      submissionId: id,
      studyId: currentSubmission.studyId
    });

    return updatedSubmission;
  }

  /**
   * Find IRB submission by ID
   */
  static async findById(id: string, includeStudy: boolean = false): Promise<IRBSubmission | null> {
    let query = `
      SELECT irb.*
      ${includeStudy ? ', s.title as study_title, s.protocol_number as study_protocol' : ''}
      ${includeStudy ? ', r.first_name as reviewer_first_name, r.last_name as reviewer_last_name' : ''}
      FROM irb_submissions irb
      ${includeStudy ? 'LEFT JOIN studies s ON irb.study_id = s.id' : ''}
      ${includeStudy ? 'LEFT JOIN users r ON irb.reviewer_id = r.id' : ''}
      WHERE irb.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const submission = transformers.transformRow<IRBSubmission>(row);

    if (includeStudy && row.study_title) {
      (submission as any).study = {
        title: row.study_title,
        protocolNumber: row.study_protocol,
      };
    }

    if (includeStudy && row.reviewer_first_name) {
      submission.reviewer = {
        id: submission.reviewerId!,
        firstName: row.reviewer_first_name,
        lastName: row.reviewer_last_name,
      } as Partial<User>;
    }

    return submission;
  }

  /**
   * Find IRB submissions by study ID
   */
  static async findByStudyId(studyId: string): Promise<IRBSubmission[]> {
    const query = `
      SELECT irb.*,
             r.first_name as reviewer_first_name,
             r.last_name as reviewer_last_name
      FROM irb_submissions irb
      LEFT JOIN users r ON irb.reviewer_id = r.id
      WHERE irb.study_id = $1
      ORDER BY irb.created_at DESC
    `;

    const result = await db.query(query, [studyId]);
    return result.rows.map(row => {
      const submission = transformers.transformRow<IRBSubmission>(row);
      if (row.reviewer_first_name) {
        submission.reviewer = {
          id: submission.reviewerId!,
          firstName: row.reviewer_first_name,
          lastName: row.reviewer_last_name,
        } as Partial<User>;
      }
      return submission;
    });
  }

  /**
   * Get current active IRB submission for a study
   */
  static async getCurrentSubmission(studyId: string): Promise<IRBSubmission | null> {
    const query = `
      SELECT * FROM irb_submissions
      WHERE study_id = $1 AND status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED')
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await db.query(query, [studyId]);
    return result.rows.length > 0 ? transformers.transformRow<IRBSubmission>(result.rows[0]) : null;
  }

  /**
   * List submissions with filtering
   */
  static async list(filters: {
    status?: IRBSubmissionStatus;
    reviewPath?: IRBReviewPath;
    reviewerId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      whereConditions.push(`irb.status = $${paramIndex++}`);
      queryParams.push(filters.status);
    }

    if (filters.reviewPath) {
      whereConditions.push(`irb.review_path = $${paramIndex++}`);
      queryParams.push(filters.reviewPath);
    }

    if (filters.reviewerId) {
      whereConditions.push(`irb.reviewer_id = $${paramIndex++}`);
      queryParams.push(filters.reviewerId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `SELECT COUNT(*) as count FROM irb_submissions irb ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const dataQuery = `
      SELECT
        irb.*,
        s.title as study_title,
        s.protocol_number as study_protocol,
        r.first_name as reviewer_first_name,
        r.last_name as reviewer_last_name
      FROM irb_submissions irb
      LEFT JOIN studies s ON irb.study_id = s.id
      LEFT JOIN users r ON irb.reviewer_id = r.id
      ${whereClause}
      ORDER BY irb.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await db.query(dataQuery, queryParams);

    const submissions = dataResult.rows.map(row => {
      const submission = transformers.transformRow<IRBSubmission>(row);
      (submission as any).study = {
        title: row.study_title,
        protocolNumber: row.study_protocol,
      };
      if (row.reviewer_first_name) {
        submission.reviewer = {
          id: submission.reviewerId!,
          firstName: row.reviewer_first_name,
          lastName: row.reviewer_last_name,
        } as Partial<User>;
      }
      return submission;
    });

    return {
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Check if submission can be approved
   */
  private static canApprove(status: IRBSubmissionStatus): boolean {
    return [IRBSubmissionStatus.SUBMITTED, IRBSubmissionStatus.UNDER_REVIEW].includes(status);
  }

  /**
   * Check if submission can be disapproved
   */
  private static canDisapprove(status: IRBSubmissionStatus): boolean {
    return [IRBSubmissionStatus.SUBMITTED, IRBSubmissionStatus.UNDER_REVIEW].includes(status);
  }

  /**
   * Validate study is ready for IRB submission
   */
  private static async validateStudyForSubmission(studyId: string): Promise<Study> {
    const study = await db.query('SELECT * FROM studies WHERE id = $1', [studyId]);

    if (study.rows.length === 0) {
      throw new Error('Study not found');
    }

    const studyData = transformers.transformRow<Study>(study.rows[0]);

    if (![StudyStatus.DRAFT, StudyStatus.READY_TO_SUBMIT].includes(studyData.status)) {
      throw new Error(`Study must be in DRAFT or READY_TO_SUBMIT status to create IRB submission. Current status: ${studyData.status}`);
    }

    return studyData;
  }

  /**
   * Validate submission requirements
   */
  private static async validateSubmissionRequirements(studyId: string): Promise<void> {
    // Check for required documents
    const requiredDocTypes = ['PROTOCOL', 'CONSENT'];
    const documentsResult = await db.query(`
      SELECT DISTINCT document_type
      FROM study_documents
      WHERE study_id = $1 AND is_current_version = true
    `, [studyId]);

    const existingDocTypes = documentsResult.rows.map(row => row.document_type);
    const missingDocs = requiredDocTypes.filter(type => !existingDocTypes.includes(type));

    if (missingDocs.length > 0) {
      throw new Error(`Missing required documents: ${missingDocs.join(', ')}`);
    }

    // Additional validation can be added here
  }

  /**
   * Generate unique submission number
   */
  private static async generateSubmissionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await db.query(`
      SELECT COUNT(*) + 1 as next_seq
      FROM irb_submissions
      WHERE submission_number LIKE $1
    `, [`IRB-${year}-%`]);

    const sequence = result.rows[0].next_seq.toString().padStart(6, '0');
    return `IRB-${year}-${sequence}`;
  }
}