import { QueryResult } from 'pg';
import {
  Participant,
  ParticipantStatus,
  CreateParticipantRequest,
  UpdateParticipantRequest,
  ParticipantListResponse,
  EnrollmentHistory,
} from '@research-study/shared';
import {
  query,
  withTransaction,
  buildWhereClause,
  buildPaginationClause,
  getAuditFields,
  logPhiAccess,
  handleDatabaseError,
  NotFoundError,
  ConflictError,
  PaginationOptions,
  DatabaseClient,
} from '../utils/database';
import { createLogger } from '@research-study/shared';

const logger = createLogger('participant-service:repository');

export interface ParticipantFilters {
  studyId?: string;
  status?: ParticipantStatus | ParticipantStatus[];
  siteId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export class ParticipantRepository {
  // Create new participant
  async create(
    data: CreateParticipantRequest,
    userId: string,
    client?: DatabaseClient
  ): Promise<Participant> {
    try {
      const auditFields = getAuditFields(userId);

      const result = await query<Participant>(
        `INSERT INTO participants (
          study_id, external_id, screening_number, site_id,
          status, enrollment_date, created_by, updated_by,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          data.studyId,
          data.externalId,
          data.screeningNumber,
          data.siteId,
          data.screeningNumber ? 'SCREENING' : 'PRESCREENING',
          new Date(),
          auditFields.created_by,
          auditFields.updated_by,
          auditFields.created_at,
          auditFields.updated_at,
        ],
        client
      );

      if (result.rows.length === 0) {
        throw new Error('Failed to create participant');
      }

      const participant = this.mapDbToParticipant(result.rows[0]);

      logger.info('Participant created', {
        participantId: participant.id,
        studyId: data.studyId,
        externalId: data.externalId,
        createdBy: userId,
      });

      return participant;
    } catch (error) {
      logger.error('Failed to create participant', {
        error: error.message,
        studyId: data.studyId,
        externalId: data.externalId,
      });
      handleDatabaseError(error);
    }
  }

  // Get participant by ID
  async findById(
    id: string,
    userId: string,
    logAccess = true
  ): Promise<Participant | null> {
    try {
      const result = await query<any>(
        'SELECT * FROM participants WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const participant = this.mapDbToParticipant(result.rows[0]);

      if (logAccess) {
        await logPhiAccess(
          id,
          userId,
          'READ',
          'participant',
          id
        );
      }

      return participant;
    } catch (error) {
      logger.error('Failed to find participant by ID', {
        error: error.message,
        participantId: id,
      });
      handleDatabaseError(error);
    }
  }

  // Get participant by external ID and study
  async findByExternalId(
    studyId: string,
    externalId: string,
    userId: string
  ): Promise<Participant | null> {
    try {
      const result = await query<any>(
        'SELECT * FROM participants WHERE study_id = $1 AND external_id = $2',
        [studyId, externalId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const participant = this.mapDbToParticipant(result.rows[0]);

      await logPhiAccess(
        participant.id,
        userId,
        'READ',
        'participant',
        participant.id
      );

      return participant;
    } catch (error) {
      logger.error('Failed to find participant by external ID', {
        error: error.message,
        studyId,
        externalId,
      });
      handleDatabaseError(error);
    }
  }

  // List participants with filtering and pagination
  async findMany(
    filters: ParticipantFilters = {},
    pagination: PaginationOptions = {},
    userId: string
  ): Promise<ParticipantListResponse> {
    try {
      // Build base WHERE conditions
      const conditions: Record<string, any> = {};

      if (filters.studyId) {
        conditions.study_id = filters.studyId;
      }

      if (filters.status) {
        conditions.status = filters.status;
      }

      if (filters.siteId) {
        conditions.site_id = filters.siteId;
      }

      // Build WHERE clause
      const { whereClause, values, nextIndex } = buildWhereClause(conditions);

      // Add date range filtering
      let dateRangeClause = '';
      const dateValues: any[] = [];
      let currentIndex = nextIndex;

      if (filters.startDate || filters.endDate) {
        const dateParts: string[] = [];
        if (filters.startDate) {
          dateParts.push(`enrollment_date >= $${currentIndex++}`);
          dateValues.push(filters.startDate);
        }
        if (filters.endDate) {
          dateParts.push(`enrollment_date <= $${currentIndex++}`);
          dateValues.push(filters.endDate);
        }
        dateRangeClause = dateParts.length > 0 ?
          (whereClause ? ' AND ' : 'WHERE ') + dateParts.join(' AND ') : '';
      }

      // Add search filtering
      let searchClause = '';
      const searchValues: any[] = [];

      if (filters.search) {
        searchClause = (whereClause || dateRangeClause ? ' AND ' : 'WHERE ') +
          `(external_id ILIKE $${currentIndex++} OR screening_number ILIKE $${currentIndex++})`;
        const searchPattern = `%${filters.search}%`;
        searchValues.push(searchPattern, searchPattern);
      }

      // Build pagination
      const { clause: paginationClause, values: paginationValues } =
        buildPaginationClause(pagination, currentIndex);

      // Combine all values
      const allValues = [...values, ...dateValues, ...searchValues, ...paginationValues];

      // Build and execute count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM participants
        ${whereClause}${dateRangeClause}${searchClause}
      `;

      const countResult = await query<{ total: string }>(
        countQuery,
        [...values, ...dateValues, ...searchValues]
      );

      const total = parseInt(countResult.rows[0].total);

      // Build and execute main query
      const mainQuery = `
        SELECT *
        FROM participants
        ${whereClause}${dateRangeClause}${searchClause}
        ${paginationClause}
      `;

      const result = await query<any>(mainQuery, allValues);

      const participants = result.rows.map(row => this.mapDbToParticipant(row));

      // Log access for each participant (batch logging)
      const participantIds = participants.map(p => p.id);
      if (participantIds.length > 0) {
        await Promise.all(
          participantIds.map(id =>
            logPhiAccess(id, userId, 'LIST', 'participant', id)
          )
        );
      }

      const { page = 1, limit = 20 } = pagination;
      const totalPages = Math.ceil(total / limit);

      return {
        participants,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        filters: {
          status: Array.isArray(filters.status) ? filters.status :
                  filters.status ? [filters.status] : undefined,
          siteId: filters.siteId,
          dateRange: filters.startDate && filters.endDate ? {
            startDate: filters.startDate,
            endDate: filters.endDate,
          } : undefined,
        },
      };
    } catch (error) {
      logger.error('Failed to list participants', {
        error: error.message,
        filters,
        pagination,
      });
      handleDatabaseError(error);
    }
  }

  // Update participant
  async update(
    id: string,
    data: UpdateParticipantRequest,
    userId: string,
    client?: DatabaseClient
  ): Promise<Participant> {
    try {
      // First, get the current participant to validate status transitions
      const current = await this.findById(id, userId, false);
      if (!current) {
        throw new NotFoundError('Participant not found');
      }

      // Build update fields
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }

      if (data.withdrawalDate !== undefined) {
        updateFields.push(`withdrawal_date = $${paramIndex++}`);
        values.push(data.withdrawalDate);
      }

      if (data.withdrawalReason !== undefined) {
        updateFields.push(`withdrawal_reason = $${paramIndex++}`);
        values.push(data.withdrawalReason);
      }

      if (data.completionDate !== undefined) {
        updateFields.push(`completion_date = $${paramIndex++}`);
        values.push(data.completionDate);
      }

      if (data.randomizationCode !== undefined) {
        updateFields.push(`randomization_code = $${paramIndex++}`);
        values.push(data.randomizationCode);
      }

      if (updateFields.length === 0) {
        return current; // No changes to make
      }

      // Add audit fields
      updateFields.push(`updated_by = $${paramIndex++}`);
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(userId, new Date());

      // Add ID for WHERE clause
      values.push(id);

      const result = await query<any>(
        `UPDATE participants
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values,
        client
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Participant not found');
      }

      const participant = this.mapDbToParticipant(result.rows[0]);

      // Log PHI access
      await logPhiAccess(
        id,
        userId,
        'UPDATE',
        'participant',
        id,
        Object.keys(data)
      );

      logger.info('Participant updated', {
        participantId: id,
        changes: Object.keys(data),
        updatedBy: userId,
      });

      return participant;
    } catch (error) {
      logger.error('Failed to update participant', {
        error: error.message,
        participantId: id,
        changes: Object.keys(data),
      });
      handleDatabaseError(error);
    }
  }

  // Get enrollment history
  async getEnrollmentHistory(
    participantId: string,
    userId: string
  ): Promise<EnrollmentHistory[]> {
    try {
      const result = await query<any>(
        `SELECT * FROM enrollment_history
         WHERE participant_id = $1
         ORDER BY changed_date DESC`,
        [participantId]
      );

      const history = result.rows.map(row => ({
        id: row.id,
        participantId: row.participant_id,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        changedBy: row.changed_by,
        changedDate: row.changed_date,
        reason: row.reason,
        notes: row.notes,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      }));

      // Log access
      await logPhiAccess(
        participantId,
        userId,
        'READ',
        'enrollment_history'
      );

      return history;
    } catch (error) {
      logger.error('Failed to get enrollment history', {
        error: error.message,
        participantId,
      });
      handleDatabaseError(error);
    }
  }

  // Check if external ID exists in study
  async externalIdExists(
    studyId: string,
    externalId: string,
    excludeParticipantId?: string
  ): Promise<boolean> {
    try {
      let whereClause = 'WHERE study_id = $1 AND external_id = $2';
      const values = [studyId, externalId];

      if (excludeParticipantId) {
        whereClause += ' AND id != $3';
        values.push(excludeParticipantId);
      }

      const result = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM participants ${whereClause}`,
        values
      );

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Failed to check external ID existence', {
        error: error.message,
        studyId,
        externalId,
      });
      handleDatabaseError(error);
    }
  }

  // Get participants by study
  async findByStudy(
    studyId: string,
    userId: string,
    status?: ParticipantStatus[]
  ): Promise<Participant[]> {
    try {
      let whereClause = 'WHERE study_id = $1';
      const values = [studyId];

      if (status && status.length > 0) {
        const placeholders = status.map((_, index) => `$${index + 2}`).join(', ');
        whereClause += ` AND status IN (${placeholders})`;
        values.push(...status);
      }

      const result = await query<any>(
        `SELECT * FROM participants ${whereClause} ORDER BY enrollment_date DESC`,
        values
      );

      const participants = result.rows.map(row => this.mapDbToParticipant(row));

      // Log access for each participant
      await Promise.all(
        participants.map(p =>
          logPhiAccess(p.id, userId, 'READ', 'participant', p.id)
        )
      );

      return participants;
    } catch (error) {
      logger.error('Failed to find participants by study', {
        error: error.message,
        studyId,
        status,
      });
      handleDatabaseError(error);
    }
  }

  // Get study statistics
  async getStudyStatistics(studyId: string): Promise<{
    totalParticipants: number;
    byStatus: Record<ParticipantStatus, number>;
    enrollmentTrend: Array<{ date: string; count: number }>;
  }> {
    try {
      // Get total and by status
      const statusResult = await query<{ status: ParticipantStatus; count: string }>(
        `SELECT status, COUNT(*) as count
         FROM participants
         WHERE study_id = $1
         GROUP BY status`,
        [studyId]
      );

      // Get enrollment trend (last 30 days)
      const trendResult = await query<{ date: string; count: string }>(
        `SELECT date_trunc('day', enrollment_date) as date, COUNT(*) as count
         FROM participants
         WHERE study_id = $1 AND enrollment_date >= NOW() - INTERVAL '30 days'
         GROUP BY date_trunc('day', enrollment_date)
         ORDER BY date`,
        [studyId]
      );

      const byStatus: Record<ParticipantStatus, number> = {} as any;
      let totalParticipants = 0;

      statusResult.rows.forEach(row => {
        const count = parseInt(row.count);
        byStatus[row.status] = count;
        totalParticipants += count;
      });

      const enrollmentTrend = trendResult.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count),
      }));

      return {
        totalParticipants,
        byStatus,
        enrollmentTrend,
      };
    } catch (error) {
      logger.error('Failed to get study statistics', {
        error: error.message,
        studyId,
      });
      handleDatabaseError(error);
    }
  }

  // Soft delete participant (for GDPR/data retention compliance)
  async softDelete(
    id: string,
    userId: string,
    reason: string
  ): Promise<void> {
    try {
      await withTransaction(async (client) => {
        // Update participant status to terminated
        await query(
          `UPDATE participants
           SET status = 'TERMINATED',
               updated_by = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [userId, id],
          client
        );

        // Log the deletion
        await query(
          `INSERT INTO enrollment_history (
            participant_id, from_status, to_status, changed_by,
            changed_date, reason, ip_address, user_agent
          ) VALUES ($1, 'ACTIVE', 'TERMINATED', $2, NOW(), $3, '0.0.0.0', 'System')`,
          [id, userId, reason],
          client
        );
      });

      logger.info('Participant soft deleted', {
        participantId: id,
        deletedBy: userId,
        reason,
      });
    } catch (error) {
      logger.error('Failed to soft delete participant', {
        error: error.message,
        participantId: id,
      });
      handleDatabaseError(error);
    }
  }

  // Helper method to map database row to Participant object
  private mapDbToParticipant(row: any): Participant {
    return {
      id: row.id,
      studyId: row.study_id,
      externalId: row.external_id,
      status: row.status,
      enrollmentDate: row.enrollment_date,
      withdrawalDate: row.withdrawal_date,
      withdrawalReason: row.withdrawal_reason,
      completionDate: row.completion_date,
      screeningNumber: row.screening_number,
      randomizationCode: row.randomization_code,
      siteId: row.site_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Export singleton instance
export const participantRepository = new ParticipantRepository();