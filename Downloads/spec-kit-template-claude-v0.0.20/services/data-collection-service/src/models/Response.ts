import { Pool } from 'pg';
import {
  FormResponse,
  ResponseStatus,
  ResponseMetadata,
  ValidationResult,
  ElectronicSignature,
  SignatureMeaning,
  AuthenticationMethod,
  CreateFormResponseRequest,
  UpdateFormResponseRequest
} from '@research-study/shared';
import { v4 as uuidv4 } from 'uuid';

export class ResponseModel {
  constructor(private db: Pool) {}

  async create(
    responseData: CreateFormResponseRequest,
    userId: string,
    metadata: ResponseMetadata
  ): Promise<FormResponse> {
    const id = uuidv4();

    const query = `
      INSERT INTO form_responses (
        id, form_id, participant_id, visit_id, user_id, status,
        data, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      id,
      responseData.formId,
      responseData.participantId,
      responseData.visitId || null,
      userId,
      ResponseStatus.DRAFT,
      JSON.stringify(responseData.data),
      JSON.stringify(metadata)
    ];

    const result = await this.db.query(query, values);
    const response = this.mapRowToFormResponse(result.rows[0]);

    // Log the creation in audit trail
    await this.logAuditTrail(id, null, responseData.data, userId, 'CREATE', metadata.ipAddress, metadata.userAgent);

    return response;
  }

  async findById(id: string): Promise<FormResponse | null> {
    const query = `
      SELECT fr.*,
             array_agg(DISTINCT es.*) FILTER (WHERE es.id IS NOT NULL) as signatures,
             array_agg(DISTINCT q.*) FILTER (WHERE q.id IS NOT NULL) as queries
      FROM form_responses fr
      LEFT JOIN electronic_signatures es ON fr.id = es.form_response_id
      LEFT JOIN queries q ON fr.id = q.form_response_id
      WHERE fr.id = $1
      GROUP BY fr.id
    `;

    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToFormResponse(result.rows[0]);
  }

  async findByParticipantAndForm(
    participantId: string,
    formId: string,
    visitId?: string
  ): Promise<FormResponse | null> {
    let query = `
      SELECT fr.*,
             array_agg(DISTINCT es.*) FILTER (WHERE es.id IS NOT NULL) as signatures,
             array_agg(DISTINCT q.*) FILTER (WHERE q.id IS NOT NULL) as queries
      FROM form_responses fr
      LEFT JOIN electronic_signatures es ON fr.id = es.form_response_id
      LEFT JOIN queries q ON fr.id = q.form_response_id
      WHERE fr.participant_id = $1 AND fr.form_id = $2
    `;

    const values = [participantId, formId];

    if (visitId) {
      query += ' AND fr.visit_id = $3';
      values.push(visitId);
    }

    query += ' GROUP BY fr.id';

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToFormResponse(result.rows[0]);
  }

  async findByParticipant(
    participantId: string,
    options: {
      status?: ResponseStatus;
      formId?: string;
      visitId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ responses: FormResponse[]; total: number }> {
    let whereClause = 'WHERE fr.participant_id = $1';
    const values: any[] = [participantId];
    let paramIndex = 2;

    if (options.status) {
      whereClause += ` AND fr.status = $${paramIndex}`;
      values.push(options.status);
      paramIndex++;
    }

    if (options.formId) {
      whereClause += ` AND fr.form_id = $${paramIndex}`;
      values.push(options.formId);
      paramIndex++;
    }

    if (options.visitId) {
      whereClause += ` AND fr.visit_id = $${paramIndex}`;
      values.push(options.visitId);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM form_responses fr ${whereClause}`;
    const countResult = await this.db.query(countQuery, values.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].total);

    // Get responses with pagination
    let query = `
      SELECT fr.*,
             array_agg(DISTINCT es.*) FILTER (WHERE es.id IS NOT NULL) as signatures,
             array_agg(DISTINCT q.*) FILTER (WHERE q.id IS NOT NULL) as queries
      FROM form_responses fr
      LEFT JOIN electronic_signatures es ON fr.id = es.form_response_id
      LEFT JOIN queries q ON fr.id = q.form_response_id
      ${whereClause}
      GROUP BY fr.id
      ORDER BY fr.created_at DESC
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
    const responses = result.rows.map(row => this.mapRowToFormResponse(row));

    return { responses, total };
  }

  async update(
    id: string,
    updateData: UpdateFormResponseRequest,
    userId: string,
    metadata: ResponseMetadata
  ): Promise<FormResponse | null> {
    // Get current response for audit trail
    const currentResponse = await this.findById(id);
    if (!currentResponse) {
      return null;
    }

    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.data !== undefined) {
      setClause.push(`data = $${paramIndex}`);
      values.push(JSON.stringify(updateData.data));
      paramIndex++;

      // Log data changes in audit trail
      await this.logDataChanges(id, currentResponse.data, updateData.data, userId, metadata.ipAddress, metadata.userAgent);
    }

    if (updateData.status !== undefined) {
      setClause.push(`status = $${paramIndex}`);
      values.push(updateData.status);
      paramIndex++;

      // Set submitted_at when status changes to SUBMITTED
      if (updateData.status === ResponseStatus.SUBMITTED) {
        setClause.push(`submitted_at = CURRENT_TIMESTAMP`);
      }
    }

    if (setClause.length === 0) {
      return currentResponse;
    }

    const query = `
      UPDATE form_responses
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    // Log the update in audit trail
    await this.logAuditTrail(
      id,
      currentResponse.data,
      updateData.data || currentResponse.data,
      userId,
      'UPDATE',
      metadata.ipAddress,
      metadata.userAgent
    );

    return this.mapRowToFormResponse(result.rows[0]);
  }

  async addElectronicSignature(
    formResponseId: string,
    userId: string,
    userName: string,
    userRole: string,
    meaning: SignatureMeaning,
    authMethod: AuthenticationMethod,
    ipAddress: string,
    biometricData?: any
  ): Promise<ElectronicSignature> {
    const id = uuidv4();

    const query = `
      INSERT INTO electronic_signatures (
        id, form_response_id, user_id, user_name, user_role, meaning,
        timestamp, ip_address, auth_method, biometric_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      id,
      formResponseId,
      userId,
      userName,
      userRole,
      meaning,
      ipAddress,
      authMethod,
      biometricData ? JSON.stringify(biometricData) : null
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToElectronicSignature(result.rows[0]);
  }

  async validateResponse(
    responseId: string,
    validationResults: ValidationResult[]
  ): Promise<FormResponse | null> {
    const query = `
      UPDATE form_responses
      SET validation_results = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, [JSON.stringify(validationResults), responseId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToFormResponse(result.rows[0]);
  }

  async lockResponse(responseId: string, userId: string): Promise<FormResponse | null> {
    const query = `
      UPDATE form_responses
      SET status = $1
      WHERE id = $2 AND status != $1
      RETURNING *
    `;

    const result = await this.db.query(query, [ResponseStatus.LOCKED, responseId]);

    if (result.rows.length === 0) {
      return null;
    }

    // Log the lock action
    await this.db.query(
      'INSERT INTO data_audit_trail (form_response_id, field_id, user_id, action, reason, timestamp) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
      [responseId, '', userId, 'LOCK', 'Response locked for compliance']
    );

    return this.mapRowToFormResponse(result.rows[0]);
  }

  async unlockResponse(responseId: string, userId: string, reason: string): Promise<FormResponse | null> {
    const query = `
      UPDATE form_responses
      SET status = $1
      WHERE id = $2 AND status = $3
      RETURNING *
    `;

    const result = await this.db.query(query, [ResponseStatus.SUBMITTED, responseId, ResponseStatus.LOCKED]);

    if (result.rows.length === 0) {
      return null;
    }

    // Log the unlock action
    await this.db.query(
      'INSERT INTO data_audit_trail (form_response_id, field_id, user_id, action, reason, timestamp) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
      [responseId, '', userId, 'UNLOCK', reason]
    );

    return this.mapRowToFormResponse(result.rows[0]);
  }

  async getAuditTrail(responseId: string): Promise<any[]> {
    const query = `
      SELECT * FROM data_audit_trail
      WHERE form_response_id = $1
      ORDER BY timestamp ASC
    `;

    const result = await this.db.query(query, [responseId]);
    return result.rows;
  }

  async delete(id: string, userId: string, reason: string): Promise<boolean> {
    // Log the deletion before actually deleting
    await this.db.query(
      'INSERT INTO data_audit_trail (form_response_id, field_id, user_id, action, reason, timestamp) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
      [id, '', userId, 'DELETE', reason]
    );

    const query = 'DELETE FROM form_responses WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  // Private methods for audit trail
  private async logAuditTrail(
    formResponseId: string,
    oldData: Record<string, any> | null,
    newData: Record<string, any>,
    userId: string,
    action: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO data_audit_trail (
        form_response_id, field_id, user_id, action, old_value, new_value,
        ip_address, user_agent, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        formResponseId,
        '', // General record change
        userId,
        action,
        oldData ? JSON.stringify(oldData) : null,
        JSON.stringify(newData),
        ipAddress,
        userAgent
      ]
    );
  }

  private async logDataChanges(
    formResponseId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    // Compare old and new data to log individual field changes
    const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const fieldId of allFields) {
      const oldValue = oldData[fieldId];
      const newValue = newData[fieldId];

      // Only log if value actually changed
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        await this.db.query(
          `INSERT INTO data_audit_trail (
            form_response_id, field_id, user_id, action, old_value, new_value,
            ip_address, user_agent, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
          [
            formResponseId,
            fieldId,
            userId,
            'UPDATE',
            oldValue !== undefined ? JSON.stringify(oldValue) : null,
            newValue !== undefined ? JSON.stringify(newValue) : null,
            ipAddress,
            userAgent
          ]
        );
      }
    }
  }

  // Mapping functions
  private mapRowToFormResponse(row: any): FormResponse {
    return {
      id: row.id,
      formId: row.form_id,
      participantId: row.participant_id,
      visitId: row.visit_id,
      userId: row.user_id,
      status: row.status as ResponseStatus,
      data: row.data || {},
      metadata: row.metadata as ResponseMetadata,
      validationResults: row.validation_results || [],
      signatures: row.signatures ? row.signatures.filter((s: any) => s.id).map((s: any) => this.mapRowToElectronicSignature(s)) : [],
      queries: row.queries ? row.queries.filter((q: any) => q.id) : [],
      submittedAt: row.submitted_at ? new Date(row.submitted_at) : undefined,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      reviewedBy: row.reviewed_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToElectronicSignature(row: any): ElectronicSignature {
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role,
      meaning: row.meaning as SignatureMeaning,
      timestamp: new Date(row.timestamp),
      ipAddress: row.ip_address,
      authMethod: row.auth_method as AuthenticationMethod,
      biometricData: row.biometric_data
    };
  }
}