import {
  AdverseEvent,
  AESeverity,
  AESeriousness,
  AEExpectedness,
  AERelatedness,
  AEStatus,
  AEHospitalization
} from '@research-study/shared';
import { query, transaction } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';

export class AdverseEventService {
  // Create new adverse event
  async createAdverseEvent(data: Partial<AdverseEvent>): Promise<AdverseEvent> {
    const id = uuidv4();
    const now = new Date();

    const result = await query(
      `INSERT INTO adverse_events (
        id, study_id, participant_id, external_id, severity, seriousness,
        expectedness, relatedness, description, onset_date, resolution_date,
        outcome, medically_significant, action_taken, concomitant_medications,
        medical_history, reported_by, reported_at, initial_report_date,
        follow_up_reports, reportable_to_fda, reportable_to_sponsor,
        reportable_to_irb, reporting_timeline, is_sae, sae_report_id,
        status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
      ) RETURNING *`,
      [
        id,
        data.studyId,
        data.participantId,
        data.externalId,
        data.severity,
        data.seriousness,
        data.expectedness,
        data.relatedness,
        data.description,
        data.onsetDate,
        data.resolutionDate,
        data.outcome,
        data.medicallySignificant || false,
        data.actionTaken,
        data.concomitantMedications,
        data.medicalHistory,
        data.reportedBy,
        data.reportedAt,
        data.initialReportDate,
        data.followUpReports || [],
        data.reportableToFDA || false,
        data.reportableToSponsor || false,
        data.reportableToIRB || false,
        data.reportingTimeline,
        data.isSAE || false,
        data.saeReportId,
        data.status || AEStatus.DRAFT,
        now,
        now
      ]
    );

    return this.mapRowToAdverseEvent(result.rows[0]);
  }

  // Get adverse event by ID
  async getAdverseEventById(id: string): Promise<AdverseEvent | null> {
    const result = await query(
      `SELECT ae.*, array_agg(
         CASE WHEN h.id IS NOT NULL THEN
           json_build_object(
             'admissionDate', h.admission_date,
             'dischargeDate', h.discharge_date,
             'reason', h.reason,
             'hospital', h.hospital
           )
         ELSE NULL END
       ) FILTER (WHERE h.id IS NOT NULL) as hospitalizations
       FROM adverse_events ae
       LEFT JOIN ae_hospitalizations h ON ae.id = h.adverse_event_id
       WHERE ae.id = $1
       GROUP BY ae.id`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const adverseEvent = this.mapRowToAdverseEvent(row);
    adverseEvent.hospitalizations = row.hospitalizations || [];

    return adverseEvent;
  }

  // Get adverse events by study with filters
  async getAdverseEventsByStudy(
    filters: {
      studyId: string;
      severity?: AESeverity;
      seriousness?: AESeriousness;
      status?: AEStatus;
      isSAE?: boolean;
      startDate?: Date;
      endDate?: Date;
    },
    pagination: { page: number; limit: number }
  ): Promise<{ adverseEvents: AdverseEvent[]; total: number; page: number; limit: number }> {
    let whereClause = 'WHERE study_id = $1';
    const params: any[] = [filters.studyId];
    let paramIndex = 2;

    if (filters.severity) {
      whereClause += ` AND severity = $${paramIndex}`;
      params.push(filters.severity);
      paramIndex++;
    }

    if (filters.seriousness) {
      whereClause += ` AND seriousness = $${paramIndex}`;
      params.push(filters.seriousness);
      paramIndex++;
    }

    if (filters.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.isSAE !== undefined) {
      whereClause += ` AND is_sae = $${paramIndex}`;
      params.push(filters.isSAE);
      paramIndex++;
    }

    if (filters.startDate) {
      whereClause += ` AND onset_date >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      whereClause += ` AND onset_date <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM adverse_events ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const offset = (pagination.page - 1) * pagination.limit;
    const dataResult = await query(
      `SELECT * FROM adverse_events ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pagination.limit, offset]
    );

    const adverseEvents = dataResult.rows.map(row => this.mapRowToAdverseEvent(row));

    return {
      adverseEvents,
      total,
      page: pagination.page,
      limit: pagination.limit
    };
  }

  // Update adverse event
  async updateAdverseEvent(id: string, data: Partial<AdverseEvent>): Promise<AdverseEvent> {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const updateableFields = [
      'severity', 'seriousness', 'expectedness', 'relatedness', 'description',
      'onset_date', 'resolution_date', 'outcome', 'medically_significant',
      'action_taken', 'concomitant_medications', 'medical_history',
      'follow_up_reports', 'reportable_to_fda', 'reportable_to_sponsor',
      'reportable_to_irb', 'reporting_timeline', 'is_sae', 'sae_report_id', 'status'
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
      return this.getAdverseEventById(id)!;
    }

    updateFields.push(`updated_at = $${paramIndex}`);
    params.push(new Date());
    paramIndex++;

    params.push(id);

    const result = await query(
      `UPDATE adverse_events SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return this.mapRowToAdverseEvent(result.rows[0]);
  }

  // Validate adverse event for submission
  async validateForSubmission(id: string): Promise<{ isValid: boolean; issues: string[] }> {
    const adverseEvent = await this.getAdverseEventById(id);
    if (!adverseEvent) {
      return { isValid: false, issues: ['Adverse event not found'] };
    }

    const issues: string[] = [];

    // Check required fields
    if (!adverseEvent.description) {
      issues.push('Description is required');
    }

    if (!adverseEvent.onsetDate) {
      issues.push('Onset date is required');
    }

    if (!adverseEvent.outcome) {
      issues.push('Outcome is required');
    }

    // SAE-specific validations
    if (adverseEvent.isSAE) {
      if (!adverseEvent.actionTaken) {
        issues.push('Action taken is required for SAEs');
      }

      // Check reporting timeline compliance
      const daysSinceOnset = Math.floor(
        (new Date().getTime() - adverseEvent.onsetDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (adverseEvent.severity === AESeverity.LIFE_THREATENING && daysSinceOnset > 1) {
        issues.push('Life-threatening SAEs must be reported within 24 hours');
      } else if (adverseEvent.expectedness === AEExpectedness.UNEXPECTED && daysSinceOnset > 7) {
        issues.push('Unexpected SAEs must be reported within 7 days');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // Add follow-up report
  async addFollowUpReport(id: string, documentId: string, description?: string): Promise<AdverseEvent> {
    const adverseEvent = await this.getAdverseEventById(id);
    if (!adverseEvent) {
      throw new Error('Adverse event not found');
    }

    const updatedFollowUpReports = [...(adverseEvent.followUpReports || []), documentId];

    return this.updateAdverseEvent(id, {
      followUpReports: updatedFollowUpReports,
      status: AEStatus.REQUIRES_FOLLOWUP
    });
  }

  // Add hospitalization
  async addHospitalization(id: string, hospitalization: AEHospitalization): Promise<AEHospitalization> {
    const hospitalizationId = uuidv4();
    const now = new Date();

    const result = await query(
      `INSERT INTO ae_hospitalizations (
        id, adverse_event_id, admission_date, discharge_date, reason, hospital, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        hospitalizationId,
        id,
        hospitalization.admissionDate,
        hospitalization.dischargeDate,
        hospitalization.reason,
        hospitalization.hospital,
        now
      ]
    );

    // Update adverse event to mark as SAE if hospitalization occurred
    await this.updateAdverseEvent(id, {
      isSAE: true,
      seriousness: AESeriousness.SERIOUS
    });

    return {
      admissionDate: result.rows[0].admission_date,
      dischargeDate: result.rows[0].discharge_date,
      reason: result.rows[0].reason,
      hospital: result.rows[0].hospital
    };
  }

  // Get SAE dashboard data
  async getSAEDashboard(studyId: string, timeframeDays: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    const result = await query(
      `SELECT
        COUNT(*) FILTER (WHERE is_sae = true) as total_saes,
        COUNT(*) FILTER (WHERE is_sae = true AND expectedness = 'UNEXPECTED') as unexpected_saes,
        COUNT(*) FILTER (WHERE is_sae = true AND severity = 'LIFE_THREATENING') as life_threatening_saes,
        COUNT(*) FILTER (WHERE is_sae = true AND outcome = 'FATAL') as fatal_saes,
        COUNT(*) FILTER (WHERE is_sae = true AND status = 'REPORTED') as reported_saes,
        COUNT(*) FILTER (WHERE is_sae = true AND status = 'DRAFT') as pending_saes,
        AVG(CASE WHEN is_sae = true AND status = 'REPORTED' AND reported_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (reported_at - onset_date)) / 86400
          ELSE NULL END) as avg_reporting_days
       FROM adverse_events
       WHERE study_id = $1 AND onset_date >= $2`,
      [studyId, startDate]
    );

    const stats = result.rows[0];

    // Get recent SAEs
    const recentSAEs = await query(
      `SELECT id, external_id, severity, expectedness, outcome, onset_date, status
       FROM adverse_events
       WHERE study_id = $1 AND is_sae = true
       ORDER BY onset_date DESC
       LIMIT 10`,
      [studyId]
    );

    return {
      totalSAEs: parseInt(stats.total_saes) || 0,
      unexpectedSAEs: parseInt(stats.unexpected_saes) || 0,
      lifeThreatening: parseInt(stats.life_threatening_saes) || 0,
      fatal: parseInt(stats.fatal_saes) || 0,
      reported: parseInt(stats.reported_saes) || 0,
      pending: parseInt(stats.pending_saes) || 0,
      avgReportingDays: stats.avg_reporting_days ? parseFloat(stats.avg_reporting_days) : null,
      recentSAEs: recentSAEs.rows.map(row => ({
        id: row.id,
        externalId: row.external_id,
        severity: row.severity,
        expectedness: row.expectedness,
        outcome: row.outcome,
        onsetDate: row.onset_date,
        status: row.status
      }))
    };
  }

  // Get adverse event statistics
  async getStatistics(studyId: string, period: string): Promise<any> {
    let groupBy: string;
    let dateFilter: string;

    switch (period) {
      case 'week':
        groupBy = "DATE_TRUNC('week', onset_date)";
        dateFilter = 'onset_date >= CURRENT_DATE - INTERVAL \'12 weeks\'';
        break;
      case 'month':
        groupBy = "DATE_TRUNC('month', onset_date)";
        dateFilter = 'onset_date >= CURRENT_DATE - INTERVAL \'12 months\'';
        break;
      case 'quarter':
        groupBy = "DATE_TRUNC('quarter', onset_date)";
        dateFilter = 'onset_date >= CURRENT_DATE - INTERVAL \'3 years\'';
        break;
      default:
        groupBy = "DATE_TRUNC('month', onset_date)";
        dateFilter = 'onset_date >= CURRENT_DATE - INTERVAL \'12 months\'';
    }

    // Time series data
    const timeSeriesResult = await query(
      `SELECT
        ${groupBy} as period,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE is_sae = true) as sae_count,
        COUNT(*) FILTER (WHERE severity = 'SEVERE') as severe_count
       FROM adverse_events
       WHERE study_id = $1 AND ${dateFilter}
       GROUP BY ${groupBy}
       ORDER BY period`,
      [studyId]
    );

    // Distribution by severity
    const severityResult = await query(
      `SELECT severity, COUNT(*) as count
       FROM adverse_events
       WHERE study_id = $1
       GROUP BY severity`,
      [studyId]
    );

    // Distribution by relatedness
    const relatednessResult = await query(
      `SELECT relatedness, COUNT(*) as count
       FROM adverse_events
       WHERE study_id = $1
       GROUP BY relatedness`,
      [studyId]
    );

    return {
      timeSeries: timeSeriesResult.rows.map(row => ({
        period: row.period,
        totalEvents: parseInt(row.total_events),
        saeCount: parseInt(row.sae_count),
        severeCount: parseInt(row.severe_count)
      })),
      severityDistribution: severityResult.rows.map(row => ({
        severity: row.severity,
        count: parseInt(row.count)
      })),
      relatednessDistribution: relatednessResult.rows.map(row => ({
        relatedness: row.relatedness,
        count: parseInt(row.count)
      }))
    };
  }

  // Private helper methods
  private mapRowToAdverseEvent(row: any): AdverseEvent {
    return {
      id: row.id,
      studyId: row.study_id,
      participantId: row.participant_id,
      externalId: row.external_id,
      severity: row.severity,
      seriousness: row.seriousness,
      expectedness: row.expectedness,
      relatedness: row.relatedness,
      description: row.description,
      onsetDate: row.onset_date,
      resolutionDate: row.resolution_date,
      outcome: row.outcome,
      medicallySignificant: row.medically_significant,
      actionTaken: row.action_taken,
      concomitantMedications: row.concomitant_medications,
      medicalHistory: row.medical_history,
      reportedBy: row.reported_by,
      reportedAt: row.reported_at,
      initialReportDate: row.initial_report_date,
      followUpReports: row.follow_up_reports || [],
      reportableToFDA: row.reportable_to_fda,
      reportableToSponsor: row.reportable_to_sponsor,
      reportableToIRB: row.reportable_to_irb,
      reportingTimeline: row.reporting_timeline,
      isSAE: row.is_sae,
      saeReportId: row.sae_report_id,
      hospitalizations: [],
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}