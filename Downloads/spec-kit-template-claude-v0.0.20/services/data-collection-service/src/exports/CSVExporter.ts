import { Pool } from 'pg';
import {
  ExportParameters,
  DataMapping,
  FormResponse,
  Form,
  Visit,
  Participant
} from '@research-study/shared';
import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';

interface ExportData {
  participants: Record<string, any>[];
  visits: Record<string, any>[];
  forms: Record<string, any>[];
  responses: Record<string, any>[];
  queries: Record<string, any>[];
  auditTrail: Record<string, any>[];
}

export class CSVExporter {
  constructor(private db: Pool) {}

  async exportToCSV(
    studyId: string,
    parameters: ExportParameters,
    outputPath: string
  ): Promise<string> {
    try {
      // Get study information
      const study = await this.getStudyInfo(studyId);

      // Create output directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportDir = path.join(outputPath, `CSV_Export_${study.protocolNumber}_${timestamp}`);
      await fs.mkdir(exportDir, { recursive: true });

      // Export data
      const data = await this.exportData(studyId, parameters);

      // Apply data mapping if provided
      const mappedData = this.applyDataMapping(data, parameters.customMapping);

      // Apply deidentification if requested
      const finalData = parameters.deidentify ? this.deidentifyData(mappedData) : mappedData;

      // Write CSV files
      await this.writeCSVFiles(finalData, exportDir);

      // Create data documentation
      await this.createDataDocumentation(study, finalData, parameters, path.join(exportDir, 'data_dictionary.json'));

      return exportDir;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  async exportToExcel(
    studyId: string,
    parameters: ExportParameters,
    outputPath: string
  ): Promise<string> {
    try {
      // Get study information
      const study = await this.getStudyInfo(studyId);

      // Create output directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportDir = path.join(outputPath, `Excel_Export_${study.protocolNumber}_${timestamp}`);
      await fs.mkdir(exportDir, { recursive: true });

      // Export data
      const data = await this.exportData(studyId, parameters);

      // Apply data mapping if provided
      const mappedData = this.applyDataMapping(data, parameters.customMapping);

      // Apply deidentification if requested
      const finalData = parameters.deidentify ? this.deidentifyData(mappedData) : mappedData;

      // Write Excel file
      const excelPath = await this.writeExcelFile(finalData, exportDir, study.protocolNumber);

      // Create data documentation
      await this.createDataDocumentation(study, finalData, parameters, path.join(exportDir, 'data_dictionary.json'));

      return exportDir;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  private async exportData(
    studyId: string,
    parameters: ExportParameters
  ): Promise<ExportData> {
    const data: ExportData = {
      participants: [],
      visits: [],
      forms: [],
      responses: [],
      queries: [],
      auditTrail: []
    };

    // Export participants
    data.participants = await this.exportParticipants(studyId, parameters);

    // Export visits
    data.visits = await this.exportVisits(studyId, parameters);

    // Export forms
    data.forms = await this.exportForms(studyId, parameters);

    // Export form responses
    data.responses = await this.exportFormResponses(studyId, parameters);

    // Export queries if included
    if (parameters.includeMetadata) {
      data.queries = await this.exportQueries(studyId, parameters);
    }

    // Export audit trail if included
    if (parameters.includeMetadata) {
      data.auditTrail = await this.exportAuditTrail(studyId, parameters);
    }

    return data;
  }

  private async exportParticipants(
    studyId: string,
    parameters: ExportParameters
  ): Promise<Record<string, any>[]> {
    let query = `
      SELECT
        p.external_id as participant_id,
        p.age,
        p.gender,
        p.race,
        p.ethnicity,
        p.status,
        p.enrollment_date,
        p.randomization_date,
        p.randomization_arm,
        p.withdrawal_date,
        p.withdrawal_reason,
        p.completion_date,
        ss.site_name,
        s.protocol_number,
        s.title as study_title
      FROM participants p
      JOIN studies s ON p.study_id = s.id
      LEFT JOIN study_sites ss ON p.site_id = ss.id
      WHERE p.study_id = $1
    `;

    const queryParams = [studyId];
    let paramIndex = 2;

    // Apply filters
    if (parameters.dateRange) {
      if (parameters.dateRange.start) {
        query += ` AND p.enrollment_date >= $${paramIndex}`;
        queryParams.push(parameters.dateRange.start);
        paramIndex++;
      }
      if (parameters.dateRange.end) {
        query += ` AND p.enrollment_date <= $${paramIndex}`;
        queryParams.push(parameters.dateRange.end);
        paramIndex++;
      }
    }

    if (parameters.participants && parameters.participants.length > 0) {
      const placeholders = parameters.participants.map((_, index) => `$${paramIndex + index}`).join(',');
      query += ` AND p.external_id IN (${placeholders})`;
      queryParams.push(...parameters.participants);
    }

    query += ' ORDER BY p.external_id';

    const result = await this.db.query(query, queryParams);

    return result.rows.map(row => ({
      participant_id: row.participant_id,
      age: row.age,
      gender: row.gender,
      race: row.race,
      ethnicity: row.ethnicity,
      status: row.status,
      enrollment_date: this.formatDate(row.enrollment_date),
      randomization_date: this.formatDate(row.randomization_date),
      randomization_arm: row.randomization_arm,
      withdrawal_date: this.formatDate(row.withdrawal_date),
      withdrawal_reason: row.withdrawal_reason,
      completion_date: this.formatDate(row.completion_date),
      site_name: row.site_name,
      protocol_number: row.protocol_number,
      study_title: row.study_title
    }));
  }

  private async exportVisits(
    studyId: string,
    parameters: ExportParameters
  ): Promise<Record<string, any>[]> {
    let query = `
      SELECT
        p.external_id as participant_id,
        vd.name as visit_name,
        vd.title as visit_title,
        vd.visit_number,
        vd.is_baseline,
        v.scheduled_date,
        v.actual_date,
        v.status as visit_status,
        v.notes,
        v.window_data,
        v.completed_at
      FROM visits v
      JOIN participants p ON v.participant_id = p.id
      JOIN visit_definitions vd ON v.visit_definition_id = vd.id
      WHERE v.study_id = $1
    `;

    const queryParams = [studyId];
    let paramIndex = 2;

    // Apply filters
    if (parameters.dateRange) {
      if (parameters.dateRange.start) {
        query += ` AND v.scheduled_date >= $${paramIndex}`;
        queryParams.push(parameters.dateRange.start);
        paramIndex++;
      }
      if (parameters.dateRange.end) {
        query += ` AND v.scheduled_date <= $${paramIndex}`;
        queryParams.push(parameters.dateRange.end);
        paramIndex++;
      }
    }

    if (parameters.participants && parameters.participants.length > 0) {
      const placeholders = parameters.participants.map((_, index) => `$${paramIndex + index}`).join(',');
      query += ` AND p.external_id IN (${placeholders})`;
      queryParams.push(...parameters.participants);
    }

    if (parameters.visits && parameters.visits.length > 0) {
      const placeholders = parameters.visits.map((_, index) => `$${paramIndex + index}`).join(',');
      query += ` AND v.id IN (${placeholders})`;
      queryParams.push(...parameters.visits);
    }

    query += ' ORDER BY p.external_id, vd.visit_number';

    const result = await this.db.query(query, queryParams);

    return result.rows.map(row => {
      const windowData = row.window_data || {};
      return {
        participant_id: row.participant_id,
        visit_name: row.visit_name,
        visit_title: row.visit_title,
        visit_number: row.visit_number,
        is_baseline: row.is_baseline,
        scheduled_date: this.formatDate(row.scheduled_date),
        actual_date: this.formatDate(row.actual_date),
        visit_status: row.visit_status,
        notes: row.notes,
        window_earliest: this.formatDate(windowData.earliestDate),
        window_target: this.formatDate(windowData.targetDate),
        window_latest: this.formatDate(windowData.latestDate),
        completed_at: this.formatDateTime(row.completed_at)
      };
    });
  }

  private async exportForms(
    studyId: string,
    parameters: ExportParameters
  ): Promise<Record<string, any>[]> {
    let query = `
      SELECT DISTINCT
        f.id,
        f.name,
        f.title,
        f.description,
        f.version,
        f.status,
        f.created_at,
        f.published_at,
        f.archived_at
      FROM forms f
      JOIN form_responses fr ON f.id = fr.form_id
      JOIN participants p ON fr.participant_id = p.id
      WHERE p.study_id = $1
    `;

    const queryParams = [studyId];

    if (parameters.forms && parameters.forms.length > 0) {
      const placeholders = parameters.forms.map((_, index) => `$${index + 2}`).join(',');
      query += ` AND f.id IN (${placeholders})`;
      queryParams.push(...parameters.forms);
    }

    query += ' ORDER BY f.name, f.version';

    const result = await this.db.query(query, queryParams);

    return result.rows.map(row => ({
      form_id: row.id,
      form_name: row.name,
      form_title: row.title,
      form_description: row.description,
      form_version: row.version,
      form_status: row.status,
      created_at: this.formatDateTime(row.created_at),
      published_at: this.formatDateTime(row.published_at),
      archived_at: this.formatDateTime(row.archived_at)
    }));
  }

  private async exportFormResponses(
    studyId: string,
    parameters: ExportParameters
  ): Promise<Record<string, any>[]> {
    let query = `
      SELECT
        p.external_id as participant_id,
        f.name as form_name,
        f.title as form_title,
        f.version as form_version,
        vd.name as visit_name,
        vd.visit_number,
        fr.data,
        fr.status as response_status,
        fr.submitted_at,
        fr.reviewed_at,
        u1.email as entered_by,
        u2.email as reviewed_by,
        fr.created_at,
        fr.updated_at
      FROM form_responses fr
      JOIN participants p ON fr.participant_id = p.id
      JOIN forms f ON fr.form_id = f.id
      LEFT JOIN visits v ON fr.visit_id = v.id
      LEFT JOIN visit_definitions vd ON v.visit_definition_id = vd.id
      LEFT JOIN users u1 ON fr.user_id = u1.id
      LEFT JOIN users u2 ON fr.reviewed_by = u2.id
      WHERE p.study_id = $1
    `;

    const queryParams = [studyId];
    let paramIndex = 2;

    // Apply filters
    if (parameters.dateRange) {
      if (parameters.dateRange.start) {
        query += ` AND fr.created_at >= $${paramIndex}`;
        queryParams.push(parameters.dateRange.start);
        paramIndex++;
      }
      if (parameters.dateRange.end) {
        query += ` AND fr.created_at <= $${paramIndex}`;
        queryParams.push(parameters.dateRange.end);
        paramIndex++;
      }
    }

    if (parameters.participants && parameters.participants.length > 0) {
      const placeholders = parameters.participants.map((_, index) => `$${paramIndex + index}`).join(',');
      query += ` AND p.external_id IN (${placeholders})`;
      queryParams.push(...parameters.participants);
      paramIndex += parameters.participants.length;
    }

    if (parameters.forms && parameters.forms.length > 0) {
      const placeholders = parameters.forms.map((_, index) => `$${paramIndex + index}`).join(',');
      query += ` AND f.id IN (${placeholders})`;
      queryParams.push(...parameters.forms);
    }

    if (!parameters.includeLocked) {
      query += ` AND fr.status != 'LOCKED'`;
    }

    if (!parameters.includeArchived) {
      query += ` AND f.status != 'ARCHIVED'`;
    }

    query += ' ORDER BY p.external_id, vd.visit_number, f.name';

    const result = await this.db.query(query, queryParams);

    const responses: Record<string, any>[] = [];

    for (const row of result.rows) {
      const baseRecord = {
        participant_id: row.participant_id,
        form_name: row.form_name,
        form_title: row.form_title,
        form_version: row.form_version,
        visit_name: row.visit_name,
        visit_number: row.visit_number,
        response_status: row.response_status,
        submitted_at: this.formatDateTime(row.submitted_at),
        reviewed_at: this.formatDateTime(row.reviewed_at),
        entered_by: row.entered_by,
        reviewed_by: row.reviewed_by,
        created_at: this.formatDateTime(row.created_at),
        updated_at: this.formatDateTime(row.updated_at)
      };

      // Flatten form data
      const formData = row.data || {};
      const flattenedData = this.flattenFormData(formData);

      responses.push({ ...baseRecord, ...flattenedData });
    }

    return responses;
  }

  private async exportQueries(
    studyId: string,
    parameters: ExportParameters
  ): Promise<Record<string, any>[]> {
    let query = `
      SELECT
        p.external_id as participant_id,
        q.type as query_type,
        q.priority,
        q.status as query_status,
        q.subject,
        q.description,
        q.current_value,
        q.suggested_value,
        q.context,
        q.created_at,
        q.due_date,
        q.resolved_at,
        u1.email as created_by,
        u2.email as assigned_to,
        u3.email as resolved_by,
        q.resolution
      FROM queries q
      JOIN participants p ON q.participant_id = p.id
      LEFT JOIN users u1 ON q.created_by = u1.id
      LEFT JOIN users u2 ON q.assigned_to = u2.id
      LEFT JOIN users u3 ON q.resolved_by = u3.id
      WHERE q.study_id = $1
    `;

    const queryParams = [studyId];

    if (parameters.participants && parameters.participants.length > 0) {
      const placeholders = parameters.participants.map((_, index) => `$${index + 2}`).join(',');
      query += ` AND p.external_id IN (${placeholders})`;
      queryParams.push(...parameters.participants);
    }

    query += ' ORDER BY p.external_id, q.created_at';

    const result = await this.db.query(query, queryParams);

    return result.rows.map(row => ({
      participant_id: row.participant_id,
      query_type: row.query_type,
      priority: row.priority,
      query_status: row.query_status,
      subject: row.subject,
      description: row.description,
      current_value: JSON.stringify(row.current_value),
      suggested_value: JSON.stringify(row.suggested_value),
      context: JSON.stringify(row.context),
      created_at: this.formatDateTime(row.created_at),
      due_date: this.formatDate(row.due_date),
      resolved_at: this.formatDateTime(row.resolved_at),
      created_by: row.created_by,
      assigned_to: row.assigned_to,
      resolved_by: row.resolved_by,
      resolution: row.resolution
    }));
  }

  private async exportAuditTrail(
    studyId: string,
    parameters: ExportParameters
  ): Promise<Record<string, any>[]> {
    let query = `
      SELECT
        dat.form_response_id,
        dat.field_id,
        dat.action,
        dat.old_value,
        dat.new_value,
        dat.reason,
        dat.timestamp,
        dat.ip_address,
        dat.user_agent,
        u.email as user_email,
        p.external_id as participant_id,
        f.name as form_name
      FROM data_audit_trail dat
      JOIN form_responses fr ON dat.form_response_id = fr.id
      JOIN participants p ON fr.participant_id = p.id
      JOIN forms f ON fr.form_id = f.id
      LEFT JOIN users u ON dat.user_id = u.id
      WHERE p.study_id = $1
    `;

    const queryParams = [studyId];

    if (parameters.participants && parameters.participants.length > 0) {
      const placeholders = parameters.participants.map((_, index) => `$${index + 2}`).join(',');
      query += ` AND p.external_id IN (${placeholders})`;
      queryParams.push(...parameters.participants);
    }

    query += ' ORDER BY dat.timestamp DESC';

    const result = await this.db.query(query, queryParams);

    return result.rows.map(row => ({
      participant_id: row.participant_id,
      form_name: row.form_name,
      field_id: row.field_id,
      action: row.action,
      old_value: JSON.stringify(row.old_value),
      new_value: JSON.stringify(row.new_value),
      reason: row.reason,
      timestamp: this.formatDateTime(row.timestamp),
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      user_email: row.user_email
    }));
  }

  private applyDataMapping(
    data: ExportData,
    mappings?: DataMapping[]
  ): ExportData {
    if (!mappings || mappings.length === 0) {
      return data;
    }

    const mappedData = { ...data };

    // Apply mappings to each dataset
    Object.keys(mappedData).forEach(datasetKey => {
      const dataset = mappedData[datasetKey as keyof ExportData] as Record<string, any>[];

      mappedData[datasetKey as keyof ExportData] = dataset.map(record => {
        const mappedRecord = { ...record };

        mappings.forEach(mapping => {
          if (record[mapping.sourceField] !== undefined) {
            // Apply transformation if specified
            let value = record[mapping.sourceField];

            if (mapping.transformation) {
              value = this.applyTransformation(value, mapping.transformation);
            }

            // Apply format if specified
            if (mapping.format) {
              value = this.applyFormat(value, mapping.format);
            }

            // Map to target field
            mappedRecord[mapping.targetField] = value;

            // Remove source field if different from target
            if (mapping.sourceField !== mapping.targetField) {
              delete mappedRecord[mapping.sourceField];
            }
          }
        });

        return mappedRecord;
      });
    });

    return mappedData;
  }

  private deidentifyData(data: ExportData): ExportData {
    const deidentifiedData = { ...data };

    // Remove or hash identifying fields
    const identifyingFields = [
      'participant_id',
      'entered_by',
      'reviewed_by',
      'created_by',
      'assigned_to',
      'resolved_by',
      'user_email',
      'ip_address',
      'user_agent'
    ];

    Object.keys(deidentifiedData).forEach(datasetKey => {
      const dataset = deidentifiedData[datasetKey as keyof ExportData] as Record<string, any>[];

      deidentifiedData[datasetKey as keyof ExportData] = dataset.map(record => {
        const deidentifiedRecord = { ...record };

        identifyingFields.forEach(field => {
          if (deidentifiedRecord[field]) {
            if (field === 'participant_id') {
              // Replace with hash
              deidentifiedRecord[field] = this.hashValue(deidentifiedRecord[field]);
            } else {
              // Remove completely
              delete deidentifiedRecord[field];
            }
          }
        });

        return deidentifiedRecord;
      });
    });

    return deidentifiedData;
  }

  private async writeCSVFiles(
    data: ExportData,
    outputDir: string
  ): Promise<void> {
    const csvFiles = [
      { name: 'participants.csv', data: data.participants },
      { name: 'visits.csv', data: data.visits },
      { name: 'forms.csv', data: data.forms },
      { name: 'responses.csv', data: data.responses },
      { name: 'queries.csv', data: data.queries },
      { name: 'audit_trail.csv', data: data.auditTrail }
    ];

    for (const file of csvFiles) {
      if (file.data.length > 0) {
        const filePath = path.join(outputDir, file.name);
        const headers = Object.keys(file.data[0]).map(key => ({ id: key, title: key }));

        const csvWriter = createCsvWriter({
          path: filePath,
          header: headers
        });

        await csvWriter.writeRecords(file.data);
      }
    }
  }

  private async writeExcelFile(
    data: ExportData,
    outputDir: string,
    protocolNumber: string
  ): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Add worksheets for each data type
    const worksheets = [
      { name: 'Participants', data: data.participants },
      { name: 'Visits', data: data.visits },
      { name: 'Forms', data: data.forms },
      { name: 'Responses', data: data.responses },
      { name: 'Queries', data: data.queries },
      { name: 'Audit Trail', data: data.auditTrail }
    ];

    worksheets.forEach(sheet => {
      if (sheet.data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      }
    });

    const filePath = path.join(outputDir, `${protocolNumber}_data_export.xlsx`);
    XLSX.writeFile(workbook, filePath);

    return filePath;
  }

  private async createDataDocumentation(
    study: any,
    data: ExportData,
    parameters: ExportParameters,
    filePath: string
  ): Promise<void> {
    const documentation = {
      study: {
        protocolNumber: study.protocol_number,
        title: study.title,
        description: study.description
      },
      export: {
        timestamp: new Date().toISOString(),
        parameters: {
          ...parameters,
          dateRange: parameters.dateRange ? {
            start: parameters.dateRange.start?.toISOString(),
            end: parameters.dateRange.end?.toISOString()
          } : undefined
        }
      },
      datasets: {
        participants: {
          recordCount: data.participants.length,
          fields: data.participants.length > 0 ? Object.keys(data.participants[0]) : []
        },
        visits: {
          recordCount: data.visits.length,
          fields: data.visits.length > 0 ? Object.keys(data.visits[0]) : []
        },
        forms: {
          recordCount: data.forms.length,
          fields: data.forms.length > 0 ? Object.keys(data.forms[0]) : []
        },
        responses: {
          recordCount: data.responses.length,
          fields: data.responses.length > 0 ? Object.keys(data.responses[0]) : []
        },
        queries: {
          recordCount: data.queries.length,
          fields: data.queries.length > 0 ? Object.keys(data.queries[0]) : []
        },
        auditTrail: {
          recordCount: data.auditTrail.length,
          fields: data.auditTrail.length > 0 ? Object.keys(data.auditTrail[0]) : []
        }
      }
    };

    await fs.writeFile(filePath, JSON.stringify(documentation, null, 2), 'utf8');
  }

  // Helper methods
  private async getStudyInfo(studyId: string): Promise<any> {
    const query = 'SELECT * FROM studies WHERE id = $1';
    const result = await this.db.query(query, [studyId]);
    return result.rows[0];
  }

  private formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  private formatDateTime(date: any): string {
    if (!date) return '';
    return new Date(date).toISOString();
  }

  private flattenFormData(data: Record<string, any>, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    Object.keys(data).forEach(key => {
      const value = data[key];
      const newKey = prefix ? `${prefix}_${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, this.flattenFormData(value, newKey));
      } else {
        flattened[newKey] = Array.isArray(value) ? value.join(';') : value;
      }
    });

    return flattened;
  }

  private applyTransformation(value: any, transformation: string): any {
    // Apply simple transformations
    switch (transformation.toLowerCase()) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'hash':
        return this.hashValue(value);
      default:
        return value;
    }
  }

  private applyFormat(value: any, format: string): any {
    // Apply formatting
    switch (format.toLowerCase()) {
      case 'date':
        return this.formatDate(value);
      case 'datetime':
        return this.formatDateTime(value);
      case 'string':
        return value?.toString() || '';
      case 'number':
        return parseFloat(value) || 0;
      default:
        return value;
    }
  }

  private hashValue(value: any): string {
    // Simple hash for deidentification
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(value.toString()).digest('hex').substring(0, 8);
  }
}