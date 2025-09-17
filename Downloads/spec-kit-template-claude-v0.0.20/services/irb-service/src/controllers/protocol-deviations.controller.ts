import { Request, Response } from 'express';
import { ProtocolDeviationService } from '../services/protocol-deviation.service';
import { ProtocolDeviationWorkflow } from '../workflows/protocol-deviation-workflow';
import {
  ProtocolDeviation,
  DeviationType,
  DeviationSeverity,
  DeviationStatus
} from '@research-study/shared';
import { logger } from '@research-study/shared';
import { logAudit } from '../utils/database';

export class ProtocolDeviationsController {
  constructor(
    private protocolDeviationService: ProtocolDeviationService,
    private protocolDeviationWorkflow: ProtocolDeviationWorkflow
  ) {}

  // Create new protocol deviation
  public createProtocolDeviation = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const {
        studyId,
        participantId,
        deviationType,
        severity,
        description,
        protocolSection,
        dateOccurred,
        dateDiscovered,
        impactOnDataIntegrity,
        impactOnParticipantSafety,
        impactOnStudyValidity,
        correctiveAction,
        preventiveAction
      } = req.body;

      // Validate required fields
      if (!studyId || !deviationType || !severity || !description || !protocolSection || !dateOccurred || !dateDiscovered) {
        res.status(400).json({
          error: 'Missing required fields: studyId, deviationType, severity, description, protocolSection, dateOccurred, dateDiscovered'
        });
        return;
      }

      const deviationData = {
        studyId,
        participantId,
        deviationType: deviationType as DeviationType,
        severity: severity as DeviationSeverity,
        description,
        protocolSection,
        dateOccurred: new Date(dateOccurred),
        dateDiscovered: new Date(dateDiscovered),
        impactOnDataIntegrity: impactOnDataIntegrity || false,
        impactOnParticipantSafety: impactOnParticipantSafety || false,
        impactOnStudyValidity: impactOnStudyValidity || false,
        correctiveAction,
        preventiveAction,
        reportedBy: userId,
        reportedAt: new Date(),
        reportableToSponsor: false,
        reportableToIRB: false,
        reportableToFDA: false,
        status: DeviationStatus.REPORTED
      };

      const deviation = await this.protocolDeviationService.createProtocolDeviation(deviationData);

      // Process through workflow to determine reporting requirements
      await this.protocolDeviationWorkflow.processNewDeviation(deviation.id);

      await logAudit(
        userId,
        'CREATE_PROTOCOL_DEVIATION',
        'ProtocolDeviation',
        deviation.id,
        null,
        deviation,
        {
          studyId,
          riskLevel: severity === DeviationSeverity.CRITICAL ? 'CRITICAL' :
                    severity === DeviationSeverity.MAJOR ? 'HIGH' : 'MEDIUM'
        }
      );

      res.status(201).json(deviation);
    } catch (error) {
      logger.error('Error creating protocol deviation:', error);
      res.status(500).json({ error: 'Failed to create protocol deviation' });
    }
  };

  // Get protocol deviation by ID
  public getProtocolDeviation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deviation = await this.protocolDeviationService.getProtocolDeviationById(id);

      if (!deviation) {
        res.status(404).json({ error: 'Protocol deviation not found' });
        return;
      }

      res.json(deviation);
    } catch (error) {
      logger.error('Error retrieving protocol deviation:', error);
      res.status(500).json({ error: 'Failed to retrieve protocol deviation' });
    }
  };

  // Get protocol deviations by study
  public getProtocolDeviationsByStudy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const {
        deviationType,
        severity,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 10
      } = req.query;

      const filters = {
        studyId,
        deviationType: deviationType as DeviationType,
        severity: severity as DeviationSeverity,
        status: status as DeviationStatus,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      };

      const result = await this.protocolDeviationService.getProtocolDeviationsByStudy(
        filters,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.json(result);
    } catch (error) {
      logger.error('Error retrieving protocol deviations by study:', error);
      res.status(500).json({ error: 'Failed to retrieve protocol deviations' });
    }
  };

  // Update protocol deviation
  public updateProtocolDeviation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      const currentDeviation = await this.protocolDeviationService.getProtocolDeviationById(id);
      if (!currentDeviation) {
        res.status(404).json({ error: 'Protocol deviation not found' });
        return;
      }

      // Check authorization
      if (currentDeviation.reportedBy !== userId && !['ADMIN', 'PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR'].includes(req.user!.role)) {
        res.status(403).json({ error: 'Not authorized to update this protocol deviation' });
        return;
      }

      // Prevent updates to closed deviations unless admin
      if (currentDeviation.status === DeviationStatus.CLOSED && !['ADMIN'].includes(req.user!.role)) {
        res.status(400).json({ error: 'Cannot update closed protocol deviation' });
        return;
      }

      const updatedDeviation = await this.protocolDeviationService.updateProtocolDeviation(id, updateData);

      // Reprocess if significant changes
      if (this.hasSignificantChanges(currentDeviation, updatedDeviation)) {
        await this.protocolDeviationWorkflow.processDeviationUpdate(id);
      }

      await logAudit(
        userId,
        'UPDATE_PROTOCOL_DEVIATION',
        'ProtocolDeviation',
        id,
        currentDeviation,
        updatedDeviation,
        {
          studyId: currentDeviation.studyId,
          riskLevel: updatedDeviation.severity === DeviationSeverity.CRITICAL ? 'CRITICAL' :
                    updatedDeviation.severity === DeviationSeverity.MAJOR ? 'HIGH' : 'MEDIUM'
        }
      );

      res.json(updatedDeviation);
    } catch (error) {
      logger.error('Error updating protocol deviation:', error);
      res.status(500).json({ error: 'Failed to update protocol deviation' });
    }
  };

  // Add corrective action
  public addCorrectiveAction = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { correctiveAction, actionTakenBy } = req.body;
      const userId = req.user!.id;

      if (!correctiveAction) {
        res.status(400).json({ error: 'Corrective action is required' });
        return;
      }

      const deviation = await this.protocolDeviationService.getProtocolDeviationById(id);
      if (!deviation) {
        res.status(404).json({ error: 'Protocol deviation not found' });
        return;
      }

      const updatedDeviation = await this.protocolDeviationService.updateProtocolDeviation(id, {
        correctiveAction,
        actionTakenBy: actionTakenBy || userId,
        actionTakenDate: new Date(),
        status: DeviationStatus.RESOLVED
      });

      await logAudit(
        userId,
        'ADD_CORRECTIVE_ACTION',
        'ProtocolDeviation',
        id,
        deviation,
        updatedDeviation,
        {
          studyId: deviation.studyId,
          riskLevel: 'MEDIUM'
        }
      );

      res.json(updatedDeviation);
    } catch (error) {
      logger.error('Error adding corrective action:', error);
      res.status(500).json({ error: 'Failed to add corrective action' });
    }
  };

  // Close protocol deviation
  public closeProtocolDeviation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user!.id;

      const deviation = await this.protocolDeviationService.getProtocolDeviationById(id);
      if (!deviation) {
        res.status(404).json({ error: 'Protocol deviation not found' });
        return;
      }

      // Check authorization
      if (!['ADMIN', 'PRINCIPAL_INVESTIGATOR'].includes(req.user!.role)) {
        res.status(403).json({ error: 'Not authorized to close protocol deviations' });
        return;
      }

      const updatedDeviation = await this.protocolDeviationWorkflow.closeDeviation(id, reason, userId);

      await logAudit(
        userId,
        'CLOSE_PROTOCOL_DEVIATION',
        'ProtocolDeviation',
        id,
        deviation,
        updatedDeviation,
        {
          studyId: deviation.studyId,
          riskLevel: 'MEDIUM'
        }
      );

      res.json(updatedDeviation);
    } catch (error) {
      logger.error('Error closing protocol deviation:', error);
      res.status(500).json({ error: 'Failed to close protocol deviation' });
    }
  };

  // Get deviation dashboard
  public getDeviationDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const { timeframe = '30' } = req.query;

      const dashboard = await this.protocolDeviationService.getDeviationDashboard(
        studyId,
        parseInt(timeframe as string)
      );

      res.json(dashboard);
    } catch (error) {
      logger.error('Error retrieving deviation dashboard:', error);
      res.status(500).json({ error: 'Failed to retrieve deviation dashboard' });
    }
  };

  // Get deviation statistics
  public getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const { period = 'month' } = req.query;

      const statistics = await this.protocolDeviationService.getStatistics(studyId, period as string);

      res.json(statistics);
    } catch (error) {
      logger.error('Error retrieving deviation statistics:', error);
      res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
  };

  // Get deviation trends
  public getDeviationTrends = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const { period = 'month', groupBy = 'type' } = req.query;

      const trends = await this.protocolDeviationService.getDeviationTrends(
        studyId,
        period as string,
        groupBy as string
      );

      res.json(trends);
    } catch (error) {
      logger.error('Error retrieving deviation trends:', error);
      res.status(500).json({ error: 'Failed to retrieve deviation trends' });
    }
  };

  // Generate deviation report
  public generateDeviationReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const { startDate, endDate, format = 'json' } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }

      const report = await this.protocolDeviationService.generateReport(
        studyId,
        new Date(startDate as string),
        new Date(endDate as string),
        format as string
      );

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="deviations-${studyId}.csv"`);
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="deviations-${studyId}.pdf"`);
      }

      res.send(report);
    } catch (error) {
      logger.error('Error generating deviation report:', error);
      res.status(500).json({ error: 'Failed to generate deviation report' });
    }
  };

  // Private helper methods
  private hasSignificantChanges(current: ProtocolDeviation, updated: ProtocolDeviation): boolean {
    return (
      current.severity !== updated.severity ||
      current.impactOnDataIntegrity !== updated.impactOnDataIntegrity ||
      current.impactOnParticipantSafety !== updated.impactOnParticipantSafety ||
      current.impactOnStudyValidity !== updated.impactOnStudyValidity
    );
  }
}