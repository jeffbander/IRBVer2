import {
  ProtocolDeviation,
  DeviationType,
  DeviationSeverity,
  DeviationStatus
} from '@research-study/shared';
import { query, transaction } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';

export class ProtocolDeviationService {
  // Create new protocol deviation
  async createProtocolDeviation(data: Partial<ProtocolDeviation>): Promise<ProtocolDeviation> {
    const id = uuidv4();
    const now = new Date();

    const result = await query(
      `INSERT INTO protocol_deviations (
        id, study_id, participant_id, deviation_type, severity, description,
        protocol_section, date_occurred, date_discovered, impact_on_data_integrity,
        impact_on_participant_safety, impact_on_study_validity, corrective_action,
        preventive_action, action_taken_by, action_taken_date, reported_by,
        reported_at, reportable_to_sponsor, reportable_to_irb, reportable_to_fda,
        status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24
      ) RETURNING *`,
      [
        id, data.studyId, data.participantId, data.deviationType, data.severity,
        data.description, data.protocolSection, data.dateOccurred, data.dateDiscovered,
        data.impactOnDataIntegrity, data.impactOnParticipantSafety, data.impactOnStudyValidity,
        data.correctiveAction, data.preventiveAction, data.actionTakenBy, data.actionTakenDate,
        data.reportedBy, data.reportedAt, data.reportableToSponsor, data.reportableToIRB,
        data.reportableToFDA, data.status, now, now
      ]
    );

    return this.mapRowToDeviation(result.rows[0]);
  }

  // Get protocol deviation by ID
  async getProtocolDeviationById(id: string): Promise<ProtocolDeviation | null> {
    const result = await query('SELECT * FROM protocol_deviations WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRowToDeviation(result.rows[0]) : null;
  }

  // Get protocol deviations by study with filters
  async getProtocolDeviationsByStudy(
    filters: {
      studyId: string;
      deviationType?: DeviationType;
      severity?: DeviationSeverity;
      status?: DeviationStatus;
      startDate?: Date;
      endDate?: Date;
    },
    pagination: { page: number; limit: number }
  ): Promise<{ deviations: ProtocolDeviation[]; total: number; page: number; limit: number }> {
    let whereClause = 'WHERE study_id = $1';
    const params: any[] = [filters.studyId];
    let paramIndex = 2;

    if (filters.deviationType) {
      whereClause += ` AND deviation_type = $${paramIndex}`;
      params.push(filters.deviationType);
      paramIndex++;
    }

    if (filters.severity) {
      whereClause += ` AND severity = $${paramIndex}`;
      params.push(filters.severity);
      paramIndex++;
    }

    if (filters.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.startDate) {
      whereClause += ` AND date_occurred >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      whereClause += ` AND date_occurred <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM protocol_deviations ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const offset = (pagination.page - 1) * pagination.limit;
    const dataResult = await query(
      `SELECT * FROM protocol_deviations ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pagination.limit, offset]
    );

    const deviations = dataResult.rows.map(row => this.mapRowToDeviation(row));

    return { deviations, total, page: pagination.page, limit: pagination.limit };
  }

  // Update protocol deviation
  async updateProtocolDeviation(id: string, data: Partial<ProtocolDeviation>): Promise<ProtocolDeviation> {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const updateableFields = [
      'severity', 'description', 'protocol_section', 'date_occurred', 'date_discovered',
      'impact_on_data_integrity', 'impact_on_participant_safety', 'impact_on_study_validity',
      'corrective_action', 'preventive_action', 'action_taken_by', 'action_taken_date',
      'reportable_to_sponsor', 'reportable_to_irb', 'reportable_to_fda', 'status'
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
      return this.getProtocolDeviationById(id)!;
    }

    updateFields.push(`updated_at = $${paramIndex}`);
    params.push(new Date());
    paramIndex++;
    params.push(id);

    const result = await query(
      `UPDATE protocol_deviations SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return this.mapRowToDeviation(result.rows[0]);
  }

  // Get deviation dashboard data
  async getDeviationDashboard(studyId: string, timeframeDays: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    const result = await query(
      `SELECT
        COUNT(*) as total_deviations,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_deviations,
        COUNT(*) FILTER (WHERE severity = 'MAJOR') as major_deviations,
        COUNT(*) FILTER (WHERE severity = 'MINOR') as minor_deviations,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved_deviations,
        COUNT(*) FILTER (WHERE status = 'REPORTED') as pending_deviations,
        COUNT(*) FILTER (WHERE impact_on_participant_safety = true) as safety_impact,
        COUNT(*) FILTER (WHERE impact_on_data_integrity = true) as data_impact
       FROM protocol_deviations
       WHERE study_id = $1 AND date_occurred >= $2`,
      [studyId, startDate]
    );

    const stats = result.rows[0];

    // Get recent deviations
    const recentDeviations = await query(
      `SELECT id, deviation_type, severity, date_occurred, status
       FROM protocol_deviations
       WHERE study_id = $1
       ORDER BY date_occurred DESC
       LIMIT 10`,
      [studyId]
    );

    return {
      totalDeviations: parseInt(stats.total_deviations) || 0,
      criticalDeviations: parseInt(stats.critical_deviations) || 0,
      majorDeviations: parseInt(stats.major_deviations) || 0,
      minorDeviations: parseInt(stats.minor_deviations) || 0,
      resolvedDeviations: parseInt(stats.resolved_deviations) || 0,
      pendingDeviations: parseInt(stats.pending_deviations) || 0,
      safetyImpact: parseInt(stats.safety_impact) || 0,
      dataImpact: parseInt(stats.data_impact) || 0,
      recentDeviations: recentDeviations.rows
    };
  }

  // Get statistics
  async getStatistics(studyId: string, period: string): Promise<any> {
    // Implementation for statistics
    return {};
  }

  // Get deviation trends
  async getDeviationTrends(studyId: string, period: string, groupBy: string): Promise<any> {
    // Implementation for trends
    return {};
  }

  // Generate report
  async generateReport(studyId: string, startDate: Date, endDate: Date, format: string): Promise<any> {
    // Implementation for report generation
    return {};
  }

  // Private helper methods
  private mapRowToDeviation(row: any): ProtocolDeviation {
    return {
      id: row.id,
      studyId: row.study_id,
      participantId: row.participant_id,
      deviationType: row.deviation_type,
      severity: row.severity,
      description: row.description,
      protocolSection: row.protocol_section,
      dateOccurred: row.date_occurred,
      dateDiscovered: row.date_discovered,
      impactOnDataIntegrity: row.impact_on_data_integrity,
      impactOnParticipantSafety: row.impact_on_participant_safety,
      impactOnStudyValidity: row.impact_on_study_validity,
      correctiveAction: row.corrective_action,
      preventiveAction: row.preventive_action,
      actionTakenBy: row.action_taken_by,
      actionTakenDate: row.action_taken_date,
      reportedBy: row.reported_by,
      reportedAt: row.reported_at,
      reportableToSponsor: row.reportable_to_sponsor,
      reportableToIRB: row.reportable_to_irb,
      reportableToFDA: row.reportable_to_fda,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}