import { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  CreateExportRequest,
  ExportRequest,
  ExportType,
  ExportFormat,
  ExportStatus,
  PaginatedResponse
} from '@research-study/shared';
import { CDISCExporter } from '../exports/CDISCExporter';
import { REDCapExporter } from '../exports/REDCapExporter';
import { CSVExporter } from '../exports/CSVExporter';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';

export class ExportController {
  private cdiscExporter: CDISCExporter;
  private redcapExporter: REDCapExporter;
  private csvExporter: CSVExporter;

  constructor(private db: Pool) {
    this.cdiscExporter = new CDISCExporter(db);
    this.redcapExporter = new REDCapExporter(db);
    this.csvExporter = new CSVExporter(db);
  }

  // Validation schema
  private createExportSchema = Joi.object({
    studyId: Joi.string().uuid().required(),
    type: Joi.string().valid(
      'STUDY_DATA', 'FORMS', 'PARTICIPANTS', 'VISITS', 'QUERIES', 'AUDIT_TRAIL', 'SAFETY_DATA'
    ).required(),
    format: Joi.string().valid(
      'CDISC_SDTM', 'CDISC_ADAM', 'REDCAP', 'CSV', 'EXCEL', 'JSON', 'XML', 'SAS', 'SPSS', 'R'
    ).required(),
    filters: Joi.array().items(Joi.object({
      field: Joi.string().required(),
      operator: Joi.string().valid(
        'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_OR_EQUAL',
        'LESS_THAN_OR_EQUAL', 'CONTAINS', 'NOT_CONTAINS', 'IN', 'NOT_IN', 'IS_EMPTY', 'IS_NOT_EMPTY'
      ).required(),
      value: Joi.any().required()
    })).optional(),
    parameters: Joi.object({
      includeMetadata: Joi.boolean().default(true),
      includeLocked: Joi.boolean().default(false),
      includeArchived: Joi.boolean().default(false),
      dateRange: Joi.object({
        start: Joi.date().iso().optional(),
        end: Joi.date().iso().optional()
      }).optional(),
      forms: Joi.array().items(Joi.string().uuid()).optional(),
      participants: Joi.array().items(Joi.string()).optional(),
      visits: Joi.array().items(Joi.string().uuid()).optional(),
      deidentify: Joi.boolean().default(false),
      customMapping: Joi.array().items(Joi.object({
        sourceField: Joi.string().required(),
        targetField: Joi.string().required(),
        transformation: Joi.string().optional(),
        format: Joi.string().optional()
      })).optional()
    }).required()
  });

  // Create export request
  createExport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = this.createExportSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const exportData: CreateExportRequest = value;

      // Validate supported format combinations
      if (!this.isFormatSupported(exportData.type, exportData.format)) {
        res.status(400).json({
          error: 'Format not supported',
          message: `Format ${exportData.format} is not supported for export type ${exportData.type}`
        });
        return;
      }

      // Create export request record
      const exportRequest = await this.createExportRequest(exportData, userId);

      // Start export process asynchronously
      this.processExport(exportRequest).catch(error => {
        console.error('Export processing error:', error);
        this.updateExportStatus(exportRequest.id, ExportStatus.FAILED, error.message);
      });

      res.status(201).json(exportRequest);
    } catch (error) {
      console.error('Error creating export:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create export'
      });
    }
  };

  // Get export request status
  getExport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid export ID' });
        return;
      }

      const exportRequest = await this.findExportById(id);

      if (!exportRequest) {
        res.status(404).json({ error: 'Export not found' });
        return;
      }

      res.json(exportRequest);
    } catch (error) {
      console.error('Error getting export:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve export'
      });
    }
  };

  // Get exports for a study
  getStudyExports = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const { status, type, format, page = '1', limit = '20' } = req.query;

      if (!studyId || !this.isValidUuid(studyId)) {
        res.status(400).json({ error: 'Invalid study ID' });
        return;
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const options: any = {
        limit: limitNum,
        offset
      };

      if (status && Object.values(ExportStatus).includes(status as ExportStatus)) {
        options.status = status as ExportStatus;
      }

      if (type && Object.values(ExportType).includes(type as ExportType)) {
        options.type = type as ExportType;
      }

      if (format && Object.values(ExportFormat).includes(format as ExportFormat)) {
        options.format = format as ExportFormat;
      }

      const { exports, total } = await this.findExportsByStudy(studyId, options);

      const response: PaginatedResponse<ExportRequest> = {
        data: exports,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting study exports:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve study exports'
      });
    }
  };

  // Download export file
  downloadExport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid export ID' });
        return;
      }

      const exportRequest = await this.findExportById(id);

      if (!exportRequest) {
        res.status(404).json({ error: 'Export not found' });
        return;
      }

      if (exportRequest.status !== ExportStatus.COMPLETED) {
        res.status(400).json({
          error: 'Export not ready',
          message: 'Export is not completed yet'
        });
        return;
      }

      if (!exportRequest.downloadUrl) {
        res.status(404).json({ error: 'Export file not found' });
        return;
      }

      // Check if file exists
      try {
        await fs.access(exportRequest.downloadUrl);
      } catch {
        res.status(404).json({ error: 'Export file no longer available' });
        return;
      }

      // Check if export has expired
      if (exportRequest.expiresAt && new Date() > exportRequest.expiresAt) {
        res.status(410).json({ error: 'Export has expired' });
        return;
      }

      // Set appropriate headers for download
      const fileName = path.basename(exportRequest.downloadUrl);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      // Stream the file
      const fileStats = await fs.stat(exportRequest.downloadUrl);
      res.setHeader('Content-Length', fileStats.size);

      // For directories (ZIP files), we'd need to create a ZIP first
      // For now, assume single file downloads
      const fileBuffer = await fs.readFile(exportRequest.downloadUrl);
      res.send(fileBuffer);
    } catch (error) {
      console.error('Error downloading export:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to download export'
      });
    }
  };

  // Cancel export
  cancelExport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid export ID' });
        return;
      }

      const exportRequest = await this.findExportById(id);

      if (!exportRequest) {
        res.status(404).json({ error: 'Export not found' });
        return;
      }

      if (exportRequest.status === ExportStatus.COMPLETED) {
        res.status(400).json({
          error: 'Cannot cancel completed export',
          message: 'Export has already completed'
        });
        return;
      }

      if (exportRequest.status === ExportStatus.CANCELLED) {
        res.status(400).json({
          error: 'Export already cancelled',
          message: 'Export is already cancelled'
        });
        return;
      }

      const cancelledExport = await this.updateExportStatus(id, ExportStatus.CANCELLED);

      res.json(cancelledExport);
    } catch (error) {
      console.error('Error cancelling export:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to cancel export'
      });
    }
  };

  // Delete export
  deleteExport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({ error: 'Invalid export ID' });
        return;
      }

      const exportRequest = await this.findExportById(id);

      if (!exportRequest) {
        res.status(404).json({ error: 'Export not found' });
        return;
      }

      // Delete export file if exists
      if (exportRequest.downloadUrl) {
        try {
          await fs.unlink(exportRequest.downloadUrl);
        } catch (error) {
          console.warn('Failed to delete export file:', error);
        }
      }

      // Delete export record
      const deleted = await this.deleteExportRecord(id);

      if (!deleted) {
        res.status(404).json({ error: 'Export not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting export:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete export'
      });
    }
  };

  // Private methods

  private async createExportRequest(
    exportData: CreateExportRequest,
    requestedBy: string
  ): Promise<ExportRequest> {
    const id = uuidv4();

    const query = `
      INSERT INTO export_requests (
        id, study_id, requested_by, type, format, filters, parameters, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      id,
      exportData.studyId,
      requestedBy,
      exportData.type,
      exportData.format,
      JSON.stringify(exportData.filters || []),
      JSON.stringify(exportData.parameters),
      ExportStatus.PENDING
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToExportRequest(result.rows[0]);
  }

  private async processExport(exportRequest: ExportRequest): Promise<void> {
    try {
      // Update status to processing
      await this.updateExportStatus(exportRequest.id, ExportStatus.PROCESSING);

      // Create output directory
      const outputDir = path.join(process.cwd(), 'exports', exportRequest.id);
      await fs.mkdir(outputDir, { recursive: true });

      let exportPath: string;

      // Process based on format
      switch (exportRequest.format) {
        case ExportFormat.CDISC_SDTM:
          exportPath = await this.cdiscExporter.exportToSDTM(
            exportRequest.studyId,
            exportRequest.parameters,
            outputDir
          );
          break;

        case ExportFormat.REDCAP:
          exportPath = await this.redcapExporter.exportToREDCap(
            exportRequest.studyId,
            exportRequest.parameters,
            outputDir
          );
          break;

        case ExportFormat.CSV:
          exportPath = await this.csvExporter.exportToCSV(
            exportRequest.studyId,
            exportRequest.parameters,
            outputDir
          );
          break;

        case ExportFormat.EXCEL:
          exportPath = await this.csvExporter.exportToExcel(
            exportRequest.studyId,
            exportRequest.parameters,
            outputDir
          );
          break;

        default:
          throw new Error(`Export format ${exportRequest.format} not implemented`);
      }

      // Set expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Update export with success
      await this.completeExport(exportRequest.id, exportPath, expiresAt);
    } catch (error) {
      console.error('Export processing failed:', error);
      await this.updateExportStatus(exportRequest.id, ExportStatus.FAILED, error.message);
    }
  }

  private async updateExportStatus(
    id: string,
    status: ExportStatus,
    error?: string
  ): Promise<ExportRequest | null> {
    const setClause = ['status = $2'];
    const values = [id, status];
    let paramIndex = 3;

    if (status === ExportStatus.PROCESSING) {
      setClause.push(`started_at = CURRENT_TIMESTAMP`);
    }

    if (status === ExportStatus.COMPLETED) {
      setClause.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    if (error) {
      setClause.push(`error = $${paramIndex}`);
      values.push(error);
      paramIndex++;
    }

    const query = `
      UPDATE export_requests
      SET ${setClause.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToExportRequest(result.rows[0]);
  }

  private async completeExport(
    id: string,
    downloadUrl: string,
    expiresAt: Date
  ): Promise<void> {
    const query = `
      UPDATE export_requests
      SET status = $2, download_url = $3, expires_at = $4, completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.db.query(query, [id, downloadUrl, expiresAt, ExportStatus.COMPLETED]);
  }

  private async findExportById(id: string): Promise<ExportRequest | null> {
    const query = 'SELECT * FROM export_requests WHERE id = $1';
    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToExportRequest(result.rows[0]);
  }

  private async findExportsByStudy(
    studyId: string,
    options: {
      status?: ExportStatus;
      type?: ExportType;
      format?: ExportFormat;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ exports: ExportRequest[]; total: number }> {
    let whereClause = 'WHERE study_id = $1';
    const values: any[] = [studyId];
    let paramIndex = 2;

    if (options.status) {
      whereClause += ` AND status = $${paramIndex}`;
      values.push(options.status);
      paramIndex++;
    }

    if (options.type) {
      whereClause += ` AND type = $${paramIndex}`;
      values.push(options.type);
      paramIndex++;
    }

    if (options.format) {
      whereClause += ` AND format = $${paramIndex}`;
      values.push(options.format);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM export_requests ${whereClause}`;
    const countResult = await this.db.query(countQuery, values.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].total);

    // Get exports with pagination
    let query = `
      SELECT * FROM export_requests ${whereClause}
      ORDER BY created_at DESC
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
    const exports = result.rows.map(row => this.mapRowToExportRequest(row));

    return { exports, total };
  }

  private async deleteExportRecord(id: string): Promise<boolean> {
    const query = 'DELETE FROM export_requests WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  private isFormatSupported(type: ExportType, format: ExportFormat): boolean {
    const supportedCombinations: Record<ExportType, ExportFormat[]> = {
      [ExportType.STUDY_DATA]: [
        ExportFormat.CDISC_SDTM,
        ExportFormat.REDCAP,
        ExportFormat.CSV,
        ExportFormat.EXCEL,
        ExportFormat.JSON
      ],
      [ExportType.FORMS]: [
        ExportFormat.JSON,
        ExportFormat.CSV,
        ExportFormat.EXCEL
      ],
      [ExportType.PARTICIPANTS]: [
        ExportFormat.CSV,
        ExportFormat.EXCEL,
        ExportFormat.JSON
      ],
      [ExportType.VISITS]: [
        ExportFormat.CSV,
        ExportFormat.EXCEL,
        ExportFormat.JSON
      ],
      [ExportType.QUERIES]: [
        ExportFormat.CSV,
        ExportFormat.EXCEL,
        ExportFormat.JSON
      ],
      [ExportType.AUDIT_TRAIL]: [
        ExportFormat.CSV,
        ExportFormat.EXCEL,
        ExportFormat.JSON
      ],
      [ExportType.SAFETY_DATA]: [
        ExportFormat.CDISC_SDTM,
        ExportFormat.CSV,
        ExportFormat.EXCEL
      ]
    };

    return supportedCombinations[type]?.includes(format) || false;
  }

  private mapRowToExportRequest(row: any): ExportRequest {
    return {
      id: row.id,
      studyId: row.study_id,
      requestedBy: row.requested_by,
      type: row.type as ExportType,
      format: row.format as ExportFormat,
      filters: row.filters || [],
      parameters: row.parameters,
      status: row.status as ExportStatus,
      createdAt: new Date(row.created_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      downloadUrl: row.download_url,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      error: row.error
    };
  }

  private isValidUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}