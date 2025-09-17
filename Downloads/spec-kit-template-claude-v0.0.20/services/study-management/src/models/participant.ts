import {
  Participant,
  ParticipantStatus,
  CreateParticipantRequest,
  ParticipantFilters,
  PaginatedResponse
} from '@research-study/shared';
import { db, queryBuilder, transformers, auditLog } from '../utils/database';
import { StudyModel } from './study';
import { createLogger } from '@research-study/shared';

const logger = createLogger('ParticipantModel');

export class ParticipantModel {

  /**
   * Create a new participant
   */
  static async create(
    studyId: string,
    data: CreateParticipantRequest,
    enrolledBy: string,
    auditContext?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<Participant> {
    // Validate that study exists and is in a status that allows enrollment
    await this.validateStudyForEnrollment(studyId);

    // Check for duplicate external ID within study
    await this.validateUniqueExternalId(studyId, data.externalId);

    const participantData = {
      study_id: studyId,
      external_id: data.externalId,
      age: data.age,
      gender: data.gender,
      race: data.race,
      ethnicity: data.ethnicity,
      status: ParticipantStatus.SCREENING,
      enrollment_date: data.enrollmentDate,
      site_id: data.siteId,
      enrolled_by: enrolledBy,
    };

    const { query, values } = queryBuilder.insert('participants', participantData);
    const result = await db.query(query, values);
    const participant = transformers.transformRow<Participant>(result.rows[0]);

    // Update study enrollment count
    await StudyModel.updateEnrollmentCount(studyId);

    // Create audit log
    await auditLog(
      enrolledBy,
      'CREATE',
      'Participant',
      participant.id,
      null,
      participant,
      auditContext?.ipAddress,
      auditContext?.userAgent,
      auditContext?.sessionId
    );

    logger.info('Participant created', {
      participantId: participant.id,
      studyId,
      externalId: participant.externalId
    });

    return participant;
  }

  /**
   * Find participant by ID
   */
  static async findById(id: string): Promise<Participant | null> {
    const query = `
      SELECT p.*,
             s.title as study_title,
             s.protocol_number as study_protocol,
             site.site_name as site_name
      FROM participants p
      LEFT JOIN studies s ON p.study_id = s.id
      LEFT JOIN study_sites site ON p.site_id = site.id
      WHERE p.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const participant = transformers.transformRow<Participant>(row);

    // Add related information
    (participant as any).study = {
      title: row.study_title,
      protocolNumber: row.study_protocol,
    };

    if (row.site_name) {
      (participant as any).site = {
        id: participant.siteId,
        siteName: row.site_name,
      };
    }

    return participant;
  }

  /**
   * Find participant by external ID within a study
   */
  static async findByExternalId(studyId: string, externalId: string): Promise<Participant | null> {
    const query = `
      SELECT * FROM participants
      WHERE study_id = $1 AND external_id = $2
    `;

    const result = await db.query(query, [studyId, externalId]);
    return result.rows.length > 0 ? transformers.transformRow<Participant>(result.rows[0]) : null;
  }

  /**
   * Update participant status
   */
  static async updateStatus(
    id: string,
    newStatus: ParticipantStatus,
    updatedBy: string,
    reason?: string,
    auditContext?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<Participant | null> {
    const currentParticipant = await this.findById(id);
    if (!currentParticipant) {
      return null;
    }

    // Validate status transition
    if (!this.isValidStatusTransition(currentParticipant.status, newStatus)) {
      throw new Error(`Invalid status transition from ${currentParticipant.status} to ${newStatus}`);
    }

    const updateData: any = {
      status: newStatus,
    };

    // Set specific fields based on status
    switch (newStatus) {
      case ParticipantStatus.ENROLLED:
        if (!currentParticipant.enrollmentDate) {
          updateData.enrollment_date = new Date();
        }
        break;
      case ParticipantStatus.WITHDRAWN:
      case ParticipantStatus.DISCONTINUED:
        updateData.withdrawal_date = new Date();
        if (reason) updateData.withdrawal_reason = reason;
        break;
      case ParticipantStatus.COMPLETED:
        updateData.completion_date = new Date();
        break;
    }

    const { query, values } = queryBuilder.update('participants', updateData, `id = '${id}'`);
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    const updatedParticipant = transformers.transformRow<Participant>(result.rows[0]);

    // Update study enrollment count
    await StudyModel.updateEnrollmentCount(currentParticipant.studyId);

    // Create audit log
    await auditLog(
      updatedBy,
      'UPDATE_STATUS',
      'Participant',
      id,
      currentParticipant,
      updatedParticipant,
      auditContext?.ipAddress,
      auditContext?.userAgent,
      auditContext?.sessionId
    );

    logger.info('Participant status updated', {
      participantId: id,
      oldStatus: currentParticipant.status,
      newStatus,
      reason
    });

    return updatedParticipant;
  }

  /**
   * Enroll participant
   */
  static async enroll(
    id: string,
    enrollmentData: {
      randomizationArm?: string;
      enrollmentDate?: Date;
    },
    enrolledBy: string,
    auditContext?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<Participant | null> {
    const currentParticipant = await this.findById(id);
    if (!currentParticipant) {
      return null;
    }

    if (currentParticipant.status !== ParticipantStatus.ELIGIBLE) {
      throw new Error(`Cannot enroll participant with status: ${currentParticipant.status}`);
    }

    const updateData = {
      status: ParticipantStatus.ENROLLED,
      enrollment_date: enrollmentData.enrollmentDate || new Date(),
      randomization_arm: enrollmentData.randomizationArm,
      randomization_date: enrollmentData.randomizationArm ? new Date() : undefined,
    };

    const { query, values } = queryBuilder.update('participants', updateData, `id = '${id}'`);
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    const updatedParticipant = transformers.transformRow<Participant>(result.rows[0]);

    // Update study enrollment count
    await StudyModel.updateEnrollmentCount(currentParticipant.studyId);

    // Create audit log
    await auditLog(
      enrolledBy,
      'ENROLL',
      'Participant',
      id,
      currentParticipant,
      updatedParticipant,
      auditContext?.ipAddress,
      auditContext?.userAgent,
      auditContext?.sessionId
    );

    logger.info('Participant enrolled', {
      participantId: id,
      studyId: currentParticipant.studyId,
      randomizationArm: enrollmentData.randomizationArm
    });

    return updatedParticipant;
  }

  /**
   * List participants with filtering and pagination
   */
  static async list(studyId: string, filters: ParticipantFilters): Promise<PaginatedResponse<Participant>> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = ['p.study_id = $1'];
    let queryParams: any[] = [studyId];
    let paramIndex = 2;

    // Build WHERE conditions
    if (filters.status) {
      whereConditions.push(`p.status = $${paramIndex++}`);
      queryParams.push(filters.status);
    }

    if (filters.siteId) {
      whereConditions.push(`p.site_id = $${paramIndex++}`);
      queryParams.push(filters.siteId);
    }

    if (filters.enrollmentDateFrom) {
      whereConditions.push(`p.enrollment_date >= $${paramIndex++}`);
      queryParams.push(filters.enrollmentDateFrom);
    }

    if (filters.enrollmentDateTo) {
      whereConditions.push(`p.enrollment_date <= $${paramIndex++}`);
      queryParams.push(filters.enrollmentDateTo);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Count query
    const countQuery = `SELECT COUNT(*) as count FROM participants p ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const dataQuery = `
      SELECT
        p.*,
        site.site_name as site_name,
        u.first_name as enrolled_by_first_name,
        u.last_name as enrolled_by_last_name
      FROM participants p
      LEFT JOIN study_sites site ON p.site_id = site.id
      LEFT JOIN users u ON p.enrolled_by = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await db.query(dataQuery, queryParams);

    const participants = dataResult.rows.map(row => {
      const participant = transformers.transformRow<Participant>(row);

      if (row.site_name) {
        (participant as any).site = {
          id: participant.siteId,
          siteName: row.site_name,
        };
      }

      if (row.enrolled_by_first_name) {
        (participant as any).enrolledBy = {
          id: participant.enrolledBy,
          firstName: row.enrolled_by_first_name,
          lastName: row.enrolled_by_last_name,
        };
      }

      return participant;
    });

    return {
      data: participants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get participant statistics for a study
   */
  static async getStudyParticipantStats(studyId: string): Promise<{
    total: number;
    byStatus: Record<ParticipantStatus, number>;
    bySite: Record<string, number>;
  }> {
    // Get counts by status
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM participants
      WHERE study_id = $1
      GROUP BY status
    `;
    const statusResult = await db.query(statusQuery, [studyId]);

    const byStatus: Record<ParticipantStatus, number> = {} as any;
    Object.values(ParticipantStatus).forEach(status => {
      byStatus[status] = 0;
    });

    statusResult.rows.forEach(row => {
      byStatus[row.status as ParticipantStatus] = parseInt(row.count, 10);
    });

    // Get counts by site
    const siteQuery = `
      SELECT
        COALESCE(site.site_name, 'Unknown Site') as site_name,
        COUNT(*) as count
      FROM participants p
      LEFT JOIN study_sites site ON p.site_id = site.id
      WHERE p.study_id = $1
      GROUP BY site.site_name
    `;
    const siteResult = await db.query(siteQuery, [studyId]);

    const bySite: Record<string, number> = {};
    siteResult.rows.forEach(row => {
      bySite[row.site_name] = parseInt(row.count, 10);
    });

    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

    return { total, byStatus, bySite };
  }

  /**
   * Validate status transitions
   */
  private static isValidStatusTransition(current: ParticipantStatus, target: ParticipantStatus): boolean {
    const validTransitions: Record<ParticipantStatus, ParticipantStatus[]> = {
      [ParticipantStatus.SCREENING]: [
        ParticipantStatus.SCREEN_FAILURE,
        ParticipantStatus.ELIGIBLE,
        ParticipantStatus.WITHDRAWN
      ],
      [ParticipantStatus.SCREEN_FAILURE]: [],
      [ParticipantStatus.ELIGIBLE]: [
        ParticipantStatus.ENROLLED,
        ParticipantStatus.WITHDRAWN
      ],
      [ParticipantStatus.ENROLLED]: [
        ParticipantStatus.ACTIVE,
        ParticipantStatus.WITHDRAWN,
        ParticipantStatus.DISCONTINUED
      ],
      [ParticipantStatus.ACTIVE]: [
        ParticipantStatus.COMPLETED,
        ParticipantStatus.WITHDRAWN,
        ParticipantStatus.DISCONTINUED,
        ParticipantStatus.LOST_TO_FOLLOWUP,
        ParticipantStatus.DECEASED
      ],
      [ParticipantStatus.COMPLETED]: [ParticipantStatus.DECEASED],
      [ParticipantStatus.WITHDRAWN]: [],
      [ParticipantStatus.LOST_TO_FOLLOWUP]: [
        ParticipantStatus.ACTIVE,
        ParticipantStatus.WITHDRAWN,
        ParticipantStatus.DECEASED
      ],
      [ParticipantStatus.DISCONTINUED]: [ParticipantStatus.DECEASED],
      [ParticipantStatus.DECEASED]: []
    };

    return validTransitions[current]?.includes(target) || false;
  }

  /**
   * Validate study allows enrollment
   */
  private static async validateStudyForEnrollment(studyId: string): Promise<void> {
    const study = await db.query('SELECT status FROM studies WHERE id = $1', [studyId]);

    if (study.rows.length === 0) {
      throw new Error('Study not found');
    }

    const allowedStatuses = ['ENROLLING', 'ACTIVE'];
    if (!allowedStatuses.includes(study.rows[0].status)) {
      throw new Error(`Study status '${study.rows[0].status}' does not allow participant enrollment`);
    }
  }

  /**
   * Validate unique external ID within study
   */
  private static async validateUniqueExternalId(studyId: string, externalId: string): Promise<void> {
    const existing = await this.findByExternalId(studyId, externalId);
    if (existing) {
      throw new Error(`Participant with external ID '${externalId}' already exists in this study`);
    }
  }
}