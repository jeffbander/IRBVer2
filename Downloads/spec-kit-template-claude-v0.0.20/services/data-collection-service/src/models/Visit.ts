import { Pool } from 'pg';
import {
  Visit,
  VisitDefinition,
  VisitStatus,
  VisitWindow,
  VisitWindowDefinition,
  TimeUnit,
  ProcedureDefinition,
  CreateVisitDefinitionRequest,
  ScheduleVisitRequest,
  UpdateVisitRequest
} from '@research-study/shared';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

export class VisitModel {
  constructor(private db: Pool) {}

  // Visit Definitions
  async createVisitDefinition(
    visitDefData: CreateVisitDefinitionRequest
  ): Promise<VisitDefinition> {
    const id = uuidv4();

    const query = `
      INSERT INTO visit_definitions (
        id, study_id, name, title, description, visit_number, is_baseline,
        window_definition, procedures, forms, mandatory
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      id,
      visitDefData.studyId,
      visitDefData.name,
      visitDefData.title,
      visitDefData.description || null,
      visitDefData.visitNumber,
      visitDefData.isBaseline,
      JSON.stringify(visitDefData.window),
      JSON.stringify(visitDefData.procedures),
      JSON.stringify(visitDefData.forms),
      visitDefData.mandatory
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToVisitDefinition(result.rows[0]);
  }

  async findVisitDefinitionById(id: string): Promise<VisitDefinition | null> {
    const query = 'SELECT * FROM visit_definitions WHERE id = $1';
    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVisitDefinition(result.rows[0]);
  }

  async findVisitDefinitionsByStudyId(studyId: string): Promise<VisitDefinition[]> {
    const query = `
      SELECT * FROM visit_definitions
      WHERE study_id = $1
      ORDER BY visit_number ASC
    `;

    const result = await this.db.query(query, [studyId]);
    return result.rows.map(row => this.mapRowToVisitDefinition(row));
  }

  async updateVisitDefinition(
    id: string,
    updateData: Partial<CreateVisitDefinitionRequest>
  ): Promise<VisitDefinition | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.name !== undefined) {
      setClause.push(`name = $${paramIndex}`);
      values.push(updateData.name);
      paramIndex++;
    }

    if (updateData.title !== undefined) {
      setClause.push(`title = $${paramIndex}`);
      values.push(updateData.title);
      paramIndex++;
    }

    if (updateData.description !== undefined) {
      setClause.push(`description = $${paramIndex}`);
      values.push(updateData.description);
      paramIndex++;
    }

    if (updateData.window !== undefined) {
      setClause.push(`window_definition = $${paramIndex}`);
      values.push(JSON.stringify(updateData.window));
      paramIndex++;
    }

    if (updateData.procedures !== undefined) {
      setClause.push(`procedures = $${paramIndex}`);
      values.push(JSON.stringify(updateData.procedures));
      paramIndex++;
    }

    if (updateData.forms !== undefined) {
      setClause.push(`forms = $${paramIndex}`);
      values.push(JSON.stringify(updateData.forms));
      paramIndex++;
    }

    if (updateData.mandatory !== undefined) {
      setClause.push(`mandatory = $${paramIndex}`);
      values.push(updateData.mandatory);
      paramIndex++;
    }

    if (setClause.length === 0) {
      return this.findVisitDefinitionById(id);
    }

    const query = `
      UPDATE visit_definitions
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVisitDefinition(result.rows[0]);
  }

  // Visit Scheduling and Management
  async scheduleVisit(
    visitData: ScheduleVisitRequest,
    createdBy: string
  ): Promise<Visit> {
    const id = uuidv4();

    // Get visit definition to calculate window
    const visitDefinition = await this.findVisitDefinitionById(visitData.visitDefinitionId);
    if (!visitDefinition) {
      throw new Error('Visit definition not found');
    }

    // Calculate visit window
    const window = this.calculateVisitWindow(
      visitDefinition.window,
      visitData.scheduledDate,
      visitData.participantId
    );

    // Initialize procedures from definition
    const procedures = visitDefinition.procedures.map(proc => ({
      id: uuidv4(),
      procedureDefinitionId: proc.id,
      status: 'PENDING' as const,
      startTime: undefined,
      endTime: undefined,
      performedBy: undefined,
      notes: undefined,
      results: undefined
    }));

    const query = `
      INSERT INTO visits (
        id, study_id, participant_id, visit_definition_id, scheduled_date,
        status, window_data, procedures, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id,
      visitDefinition.studyId,
      visitData.participantId,
      visitData.visitDefinitionId,
      visitData.scheduledDate,
      VisitStatus.SCHEDULED,
      JSON.stringify(window),
      JSON.stringify(procedures),
      visitData.notes || null,
      createdBy
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToVisit(result.rows[0]);
  }

  async findVisitById(id: string): Promise<Visit | null> {
    const query = 'SELECT * FROM visits WHERE id = $1';
    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVisit(result.rows[0]);
  }

  async findVisitsByParticipant(
    participantId: string,
    options: {
      status?: VisitStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ visits: Visit[]; total: number }> {
    let whereClause = 'WHERE participant_id = $1';
    const values: any[] = [participantId];
    let paramIndex = 2;

    if (options.status) {
      whereClause += ` AND status = $${paramIndex}`;
      values.push(options.status);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM visits ${whereClause}`;
    const countResult = await this.db.query(countQuery, values.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].total);

    // Get visits with pagination
    let query = `
      SELECT * FROM visits ${whereClause}
      ORDER BY scheduled_date ASC
    `;

    if (options.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(options.limit);
      paramIndex++;
    }

    if (options.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(options.offset);
    }

    const result = await this.db.query(query, values);
    const visits = result.rows.map(row => this.mapRowToVisit(row));

    return { visits, total };
  }

  async findVisitsByStudy(
    studyId: string,
    options: {
      status?: VisitStatus;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ visits: Visit[]; total: number }> {
    let whereClause = 'WHERE study_id = $1';
    const values: any[] = [studyId];
    let paramIndex = 2;

    if (options.status) {
      whereClause += ` AND status = $${paramIndex}`;
      values.push(options.status);
      paramIndex++;
    }

    if (options.dateFrom) {
      whereClause += ` AND scheduled_date >= $${paramIndex}`;
      values.push(options.dateFrom);
      paramIndex++;
    }

    if (options.dateTo) {
      whereClause += ` AND scheduled_date <= $${paramIndex}`;
      values.push(options.dateTo);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM visits ${whereClause}`;
    const countResult = await this.db.query(countQuery, values.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].total);

    // Get visits with pagination
    let query = `
      SELECT * FROM visits ${whereClause}
      ORDER BY scheduled_date ASC
    `;

    if (options.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(options.limit);
      paramIndex++;
    }

    if (options.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(options.offset);
    }

    const result = await this.db.query(query, values);
    const visits = result.rows.map(row => this.mapRowToVisit(row));

    return { visits, total };
  }

  async updateVisit(id: string, updateData: UpdateVisitRequest): Promise<Visit | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.scheduledDate !== undefined) {
      setClause.push(`scheduled_date = $${paramIndex}`);
      values.push(updateData.scheduledDate);
      paramIndex++;
    }

    if (updateData.actualDate !== undefined) {
      setClause.push(`actual_date = $${paramIndex}`);
      values.push(updateData.actualDate);
      paramIndex++;
    }

    if (updateData.status !== undefined) {
      setClause.push(`status = $${paramIndex}`);
      values.push(updateData.status);
      paramIndex++;

      // Set completed_at when status changes to COMPLETED
      if (updateData.status === VisitStatus.COMPLETED) {
        setClause.push(`completed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updateData.notes !== undefined) {
      setClause.push(`notes = $${paramIndex}`);
      values.push(updateData.notes);
      paramIndex++;
    }

    if (setClause.length === 0) {
      return this.findVisitById(id);
    }

    const query = `
      UPDATE visits
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVisit(result.rows[0]);
  }

  async updateVisitProcedures(
    visitId: string,
    procedures: any[]
  ): Promise<Visit | null> {
    const query = `
      UPDATE visits
      SET procedures = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, [JSON.stringify(procedures), visitId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVisit(result.rows[0]);
  }

  async deleteVisit(id: string): Promise<boolean> {
    const query = 'DELETE FROM visits WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  // Visit Window Calculations
  private calculateVisitWindow(
    windowDef: VisitWindowDefinition,
    scheduledDate: Date,
    participantId: string
  ): VisitWindow {
    // For baseline visits, use scheduled date as target
    // For other visits, calculate based on baseline date + offset
    let targetDate = scheduledDate;

    if (windowDef.baselineOffset > 0) {
      // This is not a baseline visit, calculate from baseline
      targetDate = this.addTimeToDate(scheduledDate, windowDef.baselineOffset, windowDef.unit);
    }

    const earliestDate = this.addTimeToDate(targetDate, -windowDef.earlyDays, TimeUnit.DAYS);
    const latestDate = this.addTimeToDate(targetDate, windowDef.lateDays, TimeUnit.DAYS);

    return {
      earliestDate,
      targetDate,
      latestDate
    };
  }

  private addTimeToDate(date: Date, amount: number, unit: TimeUnit): Date {
    switch (unit) {
      case TimeUnit.DAYS:
        return addDays(date, amount);
      case TimeUnit.WEEKS:
        return addWeeks(date, amount);
      case TimeUnit.MONTHS:
        return addMonths(date, amount);
      case TimeUnit.YEARS:
        return addYears(date, amount);
      default:
        return date;
    }
  }

  // Protocol Deviation Detection
  async checkForDeviations(visit: Visit): Promise<Array<{
    type: string;
    severity: string;
    description: string;
  }>> {
    const deviations: Array<{
      type: string;
      severity: string;
      description: string;
    }> = [];

    const now = new Date();
    const window = visit.window;

    // Check visit window deviation
    if (visit.actualDate) {
      if (visit.actualDate < window.earliestDate) {
        deviations.push({
          type: 'VISIT_WINDOW',
          severity: 'MINOR',
          description: `Visit occurred ${Math.ceil((window.earliestDate.getTime() - visit.actualDate.getTime()) / (1000 * 60 * 60 * 24))} days before window opened`
        });
      } else if (visit.actualDate > window.latestDate) {
        deviations.push({
          type: 'VISIT_WINDOW',
          severity: 'MAJOR',
          description: `Visit occurred ${Math.ceil((visit.actualDate.getTime() - window.latestDate.getTime()) / (1000 * 60 * 60 * 24))} days after window closed`
        });
      }
    } else if (visit.status === VisitStatus.MISSED && now > window.latestDate) {
      deviations.push({
        type: 'VISIT_WINDOW',
        severity: 'MAJOR',
        description: 'Visit was missed and window has expired'
      });
    }

    // Check procedure deviations
    for (const procedure of visit.procedures) {
      if (procedure.status === 'SKIPPED' && this.isProcedureRequired(procedure.procedureDefinitionId)) {
        deviations.push({
          type: 'PROCEDURE_OMISSION',
          severity: 'MAJOR',
          description: `Required procedure ${procedure.procedureDefinitionId} was skipped`
        });
      }
    }

    return deviations;
  }

  private isProcedureRequired(procedureId: string): boolean {
    // In practice, you'd check against the procedure definition
    // For now, assume all procedures are required
    return true;
  }

  // Mapping functions
  private mapRowToVisitDefinition(row: any): VisitDefinition {
    return {
      id: row.id,
      studyId: row.study_id,
      name: row.name,
      title: row.title,
      description: row.description,
      visitNumber: row.visit_number,
      isBaseline: row.is_baseline,
      window: row.window_definition as VisitWindowDefinition,
      procedures: row.procedures as ProcedureDefinition[],
      forms: row.forms as string[],
      mandatory: row.mandatory,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToVisit(row: any): Visit {
    return {
      id: row.id,
      studyId: row.study_id,
      participantId: row.participant_id,
      visitDefinitionId: row.visit_definition_id,
      scheduledDate: new Date(row.scheduled_date),
      actualDate: row.actual_date ? new Date(row.actual_date) : undefined,
      status: row.status as VisitStatus,
      window: row.window_data as VisitWindow,
      procedures: row.procedures || [],
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }
}