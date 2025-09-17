import { Pool } from 'pg';
import {
  Query,
  QueryResponse,
  QueryType,
  QueryPriority,
  QueryStatus,
  QueryContext,
  CreateQueryRequest,
  RespondToQueryRequest
} from '@research-study/shared';
import { v4 as uuidv4 } from 'uuid';

export class QueryModel {
  constructor(private db: Pool) {}

  async create(queryData: CreateQueryRequest, createdBy: string): Promise<Query> {
    const id = uuidv4();

    // Build context object
    const context: QueryContext = {};
    if (queryData.formResponseId) {
      // Get form and visit information for context
      const contextQuery = `
        SELECT f.title as form_name, v.title as visit_name, fr.visit_id
        FROM form_responses fr
        JOIN forms f ON fr.form_id = f.id
        LEFT JOIN visits vi ON fr.visit_id = vi.id
        LEFT JOIN visit_definitions v ON vi.visit_definition_id = v.id
        WHERE fr.id = $1
      `;
      const contextResult = await this.db.query(contextQuery, [queryData.formResponseId]);
      if (contextResult.rows.length > 0) {
        const row = contextResult.rows[0];
        context.formName = row.form_name;
        context.visitName = row.visit_name;
        context.visitId = row.visit_id;
      }
    }

    if (queryData.fieldId) {
      context.fieldName = queryData.fieldId;
    }

    const query = `
      INSERT INTO queries (
        id, form_response_id, field_id, study_id, participant_id, type, priority,
        status, subject, description, current_value, suggested_value, context,
        assigned_to, created_by, due_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      id,
      queryData.formResponseId || null,
      queryData.fieldId || null,
      queryData.studyId,
      queryData.participantId,
      queryData.type,
      queryData.priority,
      QueryStatus.OPEN,
      queryData.subject,
      queryData.description,
      queryData.currentValue ? JSON.stringify(queryData.currentValue) : null,
      queryData.suggestedValue ? JSON.stringify(queryData.suggestedValue) : null,
      JSON.stringify(context),
      queryData.assignedTo || null,
      createdBy,
      queryData.dueDate || null
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToQuery(result.rows[0]);
  }

  async findById(id: string): Promise<Query | null> {
    const query = `
      SELECT q.*,
             array_agg(qr.*) FILTER (WHERE qr.id IS NOT NULL) as responses
      FROM queries q
      LEFT JOIN query_responses qr ON q.id = qr.query_id
      WHERE q.id = $1
      GROUP BY q.id
    `;

    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const queryData = this.mapRowToQuery(result.rows[0]);
    queryData.responses = result.rows[0].responses?.filter((r: any) => r.id) || [];

    return queryData;
  }

  async findByStudy(
    studyId: string,
    options: {
      status?: QueryStatus;
      priority?: QueryPriority;
      type?: QueryType;
      assignedTo?: string;
      participantId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ queries: Query[]; total: number }> {
    let whereClause = 'WHERE q.study_id = $1';
    const values: any[] = [studyId];
    let paramIndex = 2;

    if (options.status) {
      whereClause += ` AND q.status = $${paramIndex}`;
      values.push(options.status);
      paramIndex++;
    }

    if (options.priority) {
      whereClause += ` AND q.priority = $${paramIndex}`;
      values.push(options.priority);
      paramIndex++;
    }

    if (options.type) {
      whereClause += ` AND q.type = $${paramIndex}`;
      values.push(options.type);
      paramIndex++;
    }

    if (options.assignedTo) {
      whereClause += ` AND q.assigned_to = $${paramIndex}`;
      values.push(options.assignedTo);
      paramIndex++;
    }

    if (options.participantId) {
      whereClause += ` AND q.participant_id = $${paramIndex}`;
      values.push(options.participantId);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM queries q ${whereClause}`;
    const countResult = await this.db.query(countQuery, values.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].total);

    // Get queries with pagination
    let query = `
      SELECT q.*,
             array_agg(qr.*) FILTER (WHERE qr.id IS NOT NULL) as responses
      FROM queries q
      LEFT JOIN query_responses qr ON q.id = qr.query_id
      ${whereClause}
      GROUP BY q.id
      ORDER BY q.created_at DESC
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
    const queries = result.rows.map(row => {
      const queryData = this.mapRowToQuery(row);
      queryData.responses = row.responses?.filter((r: any) => r.id) || [];
      return queryData;
    });

    return { queries, total };
  }

  async findByParticipant(
    participantId: string,
    options: {
      status?: QueryStatus;
      priority?: QueryPriority;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ queries: Query[]; total: number }> {
    let whereClause = 'WHERE q.participant_id = $1';
    const values: any[] = [participantId];
    let paramIndex = 2;

    if (options.status) {
      whereClause += ` AND q.status = $${paramIndex}`;
      values.push(options.status);
      paramIndex++;
    }

    if (options.priority) {
      whereClause += ` AND q.priority = $${paramIndex}`;
      values.push(options.priority);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM queries q ${whereClause}`;
    const countResult = await this.db.query(countQuery, values.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].total);

    // Get queries with pagination
    let query = `
      SELECT q.*,
             array_agg(qr.*) FILTER (WHERE qr.id IS NOT NULL) as responses
      FROM queries q
      LEFT JOIN query_responses qr ON q.id = qr.query_id
      ${whereClause}
      GROUP BY q.id
      ORDER BY q.created_at DESC
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
    const queries = result.rows.map(row => {
      const queryData = this.mapRowToQuery(row);
      queryData.responses = row.responses?.filter((r: any) => r.id) || [];
      return queryData;
    });

    return { queries, total };
  }

  async findAssignedToUser(
    userId: string,
    options: {
      status?: QueryStatus;
      priority?: QueryPriority;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ queries: Query[]; total: number }> {
    let whereClause = 'WHERE q.assigned_to = $1';
    const values: any[] = [userId];
    let paramIndex = 2;

    if (options.status) {
      whereClause += ` AND q.status = $${paramIndex}`;
      values.push(options.status);
      paramIndex++;
    }

    if (options.priority) {
      whereClause += ` AND q.priority = $${paramIndex}`;
      values.push(options.priority);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM queries q ${whereClause}`;
    const countResult = await this.db.query(countQuery, values.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].total);

    // Get queries with pagination
    let query = `
      SELECT q.*,
             array_agg(qr.*) FILTER (WHERE qr.id IS NOT NULL) as responses
      FROM queries q
      LEFT JOIN query_responses qr ON q.id = qr.query_id
      ${whereClause}
      GROUP BY q.id
      ORDER BY q.due_date ASC NULLS LAST, q.priority DESC, q.created_at ASC
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
    const queries = result.rows.map(row => {
      const queryData = this.mapRowToQuery(row);
      queryData.responses = row.responses?.filter((r: any) => r.id) || [];
      return queryData;
    });

    return { queries, total };
  }

  async update(
    id: string,
    updateData: Partial<CreateQueryRequest & { status: QueryStatus; assignedTo: string }>
  ): Promise<Query | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.subject !== undefined) {
      setClause.push(`subject = $${paramIndex}`);
      values.push(updateData.subject);
      paramIndex++;
    }

    if (updateData.description !== undefined) {
      setClause.push(`description = $${paramIndex}`);
      values.push(updateData.description);
      paramIndex++;
    }

    if (updateData.priority !== undefined) {
      setClause.push(`priority = $${paramIndex}`);
      values.push(updateData.priority);
      paramIndex++;
    }

    if (updateData.status !== undefined) {
      setClause.push(`status = $${paramIndex}`);
      values.push(updateData.status);
      paramIndex++;

      // Set resolved_at when status changes to CLOSED
      if (updateData.status === QueryStatus.CLOSED) {
        setClause.push(`resolved_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updateData.assignedTo !== undefined) {
      setClause.push(`assigned_to = $${paramIndex}`);
      values.push(updateData.assignedTo);
      paramIndex++;
    }

    if (updateData.dueDate !== undefined) {
      setClause.push(`due_date = $${paramIndex}`);
      values.push(updateData.dueDate);
      paramIndex++;
    }

    if (setClause.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE queries
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToQuery(result.rows[0]);
  }

  async addResponse(
    queryId: string,
    responseData: RespondToQueryRequest,
    userId: string
  ): Promise<QueryResponse> {
    const id = uuidv4();

    const query = `
      INSERT INTO query_responses (
        id, query_id, user_id, response, attachments, is_resolution
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      id,
      queryId,
      userId,
      responseData.response,
      JSON.stringify(responseData.attachments || []),
      responseData.isResolution
    ];

    const result = await this.db.query(query, values);

    // If this is a resolution, update the query status
    if (responseData.isResolution) {
      await this.resolve(queryId, responseData.response, userId);
    } else {
      // Update status to indicate response received
      await this.update(queryId, { status: QueryStatus.ANSWERED });
    }

    return this.mapRowToQueryResponse(result.rows[0]);
  }

  async resolve(queryId: string, resolution: string, resolvedBy: string): Promise<Query | null> {
    const query = `
      UPDATE queries
      SET status = $1, resolution = $2, resolved_by = $3, resolved_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await this.db.query(query, [
      QueryStatus.CLOSED,
      resolution,
      resolvedBy,
      queryId
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToQuery(result.rows[0]);
  }

  async reopen(queryId: string, reason: string): Promise<Query | null> {
    const query = `
      UPDATE queries
      SET status = $1, resolved_at = NULL, resolved_by = NULL, resolution = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await this.db.query(query, [
      QueryStatus.OPEN,
      `Reopened: ${reason}`,
      queryId
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToQuery(result.rows[0]);
  }

  async assign(queryId: string, assignedTo: string): Promise<Query | null> {
    return this.update(queryId, { assignedTo });
  }

  async escalate(queryId: string, newPriority: QueryPriority): Promise<Query | null> {
    return this.update(queryId, { priority: newPriority });
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM queries WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  // Statistics and reporting
  async getQueryStatistics(studyId?: string, participantId?: string): Promise<{
    total: number;
    byStatus: Record<QueryStatus, number>;
    byPriority: Record<QueryPriority, number>;
    byType: Record<QueryType, number>;
    overdue: number;
    avgResolutionTime: number;
  }> {
    let whereClause = '';
    const values: any[] = [];

    if (studyId) {
      whereClause = 'WHERE study_id = $1';
      values.push(studyId);
    }

    if (participantId) {
      if (whereClause) {
        whereClause += ' AND participant_id = $2';
      } else {
        whereClause = 'WHERE participant_id = $1';
      }
      values.push(participantId);
    }

    const query = `
      SELECT
        COUNT(*) as total,
        status,
        priority,
        type,
        CASE WHEN due_date < CURRENT_TIMESTAMP AND status != 'CLOSED' THEN 1 ELSE 0 END as is_overdue,
        CASE WHEN resolved_at IS NOT NULL AND created_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600
             ELSE NULL END as resolution_hours
      FROM queries
      ${whereClause}
    `;

    const result = await this.db.query(query, values);

    const stats = {
      total: 0,
      byStatus: {} as Record<QueryStatus, number>,
      byPriority: {} as Record<QueryPriority, number>,
      byType: {} as Record<QueryType, number>,
      overdue: 0,
      avgResolutionTime: 0
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const row of result.rows) {
      stats.total++;

      // Count by status
      stats.byStatus[row.status as QueryStatus] = (stats.byStatus[row.status as QueryStatus] || 0) + 1;

      // Count by priority
      stats.byPriority[row.priority as QueryPriority] = (stats.byPriority[row.priority as QueryPriority] || 0) + 1;

      // Count by type
      stats.byType[row.type as QueryType] = (stats.byType[row.type as QueryType] || 0) + 1;

      // Count overdue
      if (row.is_overdue) {
        stats.overdue++;
      }

      // Calculate average resolution time
      if (row.resolution_hours) {
        totalResolutionTime += parseFloat(row.resolution_hours);
        resolvedCount++;
      }
    }

    if (resolvedCount > 0) {
      stats.avgResolutionTime = totalResolutionTime / resolvedCount;
    }

    return stats;
  }

  // Mapping functions
  private mapRowToQuery(row: any): Query {
    return {
      id: row.id,
      formResponseId: row.form_response_id,
      fieldId: row.field_id,
      studyId: row.study_id,
      participantId: row.participant_id,
      type: row.type as QueryType,
      priority: row.priority as QueryPriority,
      status: row.status as QueryStatus,
      subject: row.subject,
      description: row.description,
      currentValue: row.current_value ? JSON.parse(row.current_value) : undefined,
      suggestedValue: row.suggested_value ? JSON.parse(row.suggested_value) : undefined,
      context: row.context ? JSON.parse(row.context) : undefined,
      assignedTo: row.assigned_to,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      resolvedBy: row.resolved_by,
      resolution: row.resolution,
      responses: [] // Will be populated separately
    };
  }

  private mapRowToQueryResponse(row: any): QueryResponse {
    return {
      id: row.id,
      queryId: row.query_id,
      userId: row.user_id,
      response: row.response,
      attachments: row.attachments || [],
      timestamp: new Date(row.timestamp),
      isResolution: row.is_resolution
    };
  }
}