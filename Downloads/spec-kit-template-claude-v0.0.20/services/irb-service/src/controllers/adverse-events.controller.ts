import { Request, Response } from 'express';
import { AdverseEventService } from '../services/adverse-event.service';
import { AdverseEventWorkflow } from '../workflows/adverse-event-workflow';
import {
  AdverseEvent,
  AESeverity,
  AESeriousness,
  AEExpectedness,
  AERelatedness,
  AEStatus,
  NotificationTrigger
} from '@research-study/shared';
import { logger } from '@research-study/shared';
import { logAudit } from '../utils/database';

export class AdverseEventsController {
  constructor(
    private adverseEventService: AdverseEventService,
    private adverseEventWorkflow: AdverseEventWorkflow
  ) {}

  // Create new adverse event report
  public createAdverseEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const {
        studyId,
        participantId,
        externalId,
        severity,
        seriousness,
        expectedness,
        relatedness,
        description,
        onsetDate,
        resolutionDate,
        outcome,
        medicallySignificant,
        actionTaken,
        concomitantMedications,
        medicalHistory
      } = req.body;

      // Validate required fields
      if (!studyId || !externalId || !severity || !seriousness || !expectedness || !relatedness || !description || !onsetDate || !outcome) {
        res.status(400).json({
          error: 'Missing required fields: studyId, externalId, severity, seriousness, expectedness, relatedness, description, onsetDate, outcome'
        });
        return;
      }

      const adverseEventData = {
        studyId,
        participantId,
        externalId,
        severity: severity as AESeverity,
        seriousness: seriousness as AESeriousness,
        expectedness: expectedness as AEExpectedness,
        relatedness: relatedness as AERelatedness,
        description,
        onsetDate: new Date(onsetDate),
        resolutionDate: resolutionDate ? new Date(resolutionDate) : undefined,
        outcome,
        medicallySignificant: medicallySignificant || false,
        actionTaken,
        concomitantMedications,
        medicalHistory,
        reportedBy: userId,
        reportedAt: new Date(),
        initialReportDate: new Date(),
        followUpReports: [],
        reportableToFDA: false,
        reportableToSponsor: false,
        reportableToIRB: false,
        isSAE: seriousness === AESeriousness.SERIOUS,
        status: AEStatus.DRAFT
      };

      const adverseEvent = await this.adverseEventService.createAdverseEvent(adverseEventData);

      // Process through workflow to determine reporting requirements
      await this.adverseEventWorkflow.processNewAdverseEvent(adverseEvent.id);

      await logAudit(
        userId,
        'CREATE_ADVERSE_EVENT',
        'AdverseEvent',
        adverseEvent.id,
        null,
        adverseEvent,
        {
          studyId,
          riskLevel: seriousness === AESeriousness.SERIOUS ? 'CRITICAL' : 'MEDIUM'
        }
      );

      res.status(201).json(adverseEvent);
    } catch (error) {
      logger.error('Error creating adverse event:', error);
      res.status(500).json({ error: 'Failed to create adverse event' });
    }
  };

  // Get adverse event by ID
  public getAdverseEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const adverseEvent = await this.adverseEventService.getAdverseEventById(id);

      if (!adverseEvent) {
        res.status(404).json({ error: 'Adverse event not found' });
        return;
      }

      res.json(adverseEvent);
    } catch (error) {
      logger.error('Error retrieving adverse event:', error);
      res.status(500).json({ error: 'Failed to retrieve adverse event' });
    }
  };

  // Get adverse events by study
  public getAdverseEventsByStudy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const {
        severity,
        seriousness,
        status,
        isSAE,
        startDate,
        endDate,
        page = 1,
        limit = 10
      } = req.query;

      const filters = {
        studyId,
        severity: severity as AESeverity,
        seriousness: seriousness as AESeriousness,
        status: status as AEStatus,
        isSAE: isSAE === 'true',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      };

      const result = await this.adverseEventService.getAdverseEventsByStudy(
        filters,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.json(result);
    } catch (error) {
      logger.error('Error retrieving adverse events by study:', error);
      res.status(500).json({ error: 'Failed to retrieve adverse events' });
    }
  };

  // Update adverse event
  public updateAdverseEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      const currentEvent = await this.adverseEventService.getAdverseEventById(id);
      if (!currentEvent) {
        res.status(404).json({ error: 'Adverse event not found' });
        return;
      }

      // Check authorization
      if (currentEvent.reportedBy !== userId && !['ADMIN', 'PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR'].includes(req.user!.role)) {
        res.status(403).json({ error: 'Not authorized to update this adverse event' });
        return;
      }

      // Prevent updates to reported events unless admin
      if (currentEvent.status !== AEStatus.DRAFT && !['ADMIN'].includes(req.user!.role)) {
        res.status(400).json({ error: 'Cannot update adverse event after reporting' });
        return;
      }

      const updatedEvent = await this.adverseEventService.updateAdverseEvent(id, updateData);

      // Reprocess through workflow if significant changes
      if (this.hasSignificantChanges(currentEvent, updatedEvent)) {
        await this.adverseEventWorkflow.processAdverseEventUpdate(id);
      }

      await logAudit(
        userId,
        'UPDATE_ADVERSE_EVENT',
        'AdverseEvent',
        id,
        currentEvent,
        updatedEvent,
        {
          studyId: currentEvent.studyId,
          riskLevel: updatedEvent.isSAE ? 'CRITICAL' : 'MEDIUM'
        }
      );

      res.json(updatedEvent);
    } catch (error) {
      logger.error('Error updating adverse event:', error);
      res.status(500).json({ error: 'Failed to update adverse event' });
    }
  };

  // Submit adverse event for reporting
  public submitAdverseEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const adverseEvent = await this.adverseEventService.getAdverseEventById(id);
      if (!adverseEvent) {
        res.status(404).json({ error: 'Adverse event not found' });
        return;
      }

      // Check authorization
      if (adverseEvent.reportedBy !== userId && !['ADMIN', 'PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR'].includes(req.user!.role)) {
        res.status(403).json({ error: 'Not authorized to submit this adverse event' });
        return;
      }

      // Validate event is ready for submission
      const validation = await this.adverseEventService.validateForSubmission(id);
      if (!validation.isValid) {
        res.status(400).json({
          error: 'Adverse event not ready for submission',
          issues: validation.issues
        });
        return;
      }

      const updatedEvent = await this.adverseEventWorkflow.submitAdverseEvent(id, userId);

      await logAudit(
        userId,
        'SUBMIT_ADVERSE_EVENT',
        'AdverseEvent',
        id,
        adverseEvent,
        updatedEvent,
        {
          studyId: adverseEvent.studyId,
          riskLevel: 'CRITICAL'
        }
      );

      res.json(updatedEvent);
    } catch (error) {
      logger.error('Error submitting adverse event:', error);
      res.status(500).json({ error: 'Failed to submit adverse event' });
    }
  };

  // Add follow-up report
  public addFollowUpReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { documentId, description } = req.body;
      const userId = req.user!.id;

      if (!documentId) {
        res.status(400).json({ error: 'Document ID is required for follow-up report' });
        return;
      }

      const adverseEvent = await this.adverseEventService.getAdverseEventById(id);
      if (!adverseEvent) {
        res.status(404).json({ error: 'Adverse event not found' });
        return;
      }

      const updatedEvent = await this.adverseEventService.addFollowUpReport(id, documentId, description);

      await logAudit(
        userId,
        'ADD_AE_FOLLOWUP',
        'AdverseEvent',
        id,
        adverseEvent,
        updatedEvent,
        {
          studyId: adverseEvent.studyId,
          documentId,
          riskLevel: 'MEDIUM'
        }
      );

      res.json(updatedEvent);
    } catch (error) {
      logger.error('Error adding follow-up report:', error);
      res.status(500).json({ error: 'Failed to add follow-up report' });
    }
  };

  // Add hospitalization
  public addHospitalization = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { admissionDate, dischargeDate, reason, hospital } = req.body;
      const userId = req.user!.id;

      if (!admissionDate || !reason || !hospital) {
        res.status(400).json({
          error: 'Missing required fields: admissionDate, reason, hospital'
        });
        return;
      }

      const adverseEvent = await this.adverseEventService.getAdverseEventById(id);
      if (!adverseEvent) {
        res.status(404).json({ error: 'Adverse event not found' });
        return;
      }

      const hospitalization = await this.adverseEventService.addHospitalization(id, {
        admissionDate: new Date(admissionDate),
        dischargeDate: dischargeDate ? new Date(dischargeDate) : undefined,
        reason,
        hospital
      });

      await logAudit(
        userId,
        'ADD_AE_HOSPITALIZATION',
        'AdverseEvent',
        id,
        null,
        hospitalization,
        {
          studyId: adverseEvent.studyId,
          riskLevel: 'CRITICAL'
        }
      );

      res.json(hospitalization);
    } catch (error) {
      logger.error('Error adding hospitalization:', error);
      res.status(500).json({ error: 'Failed to add hospitalization' });
    }
  };

  // Get SAE dashboard
  public getSAEDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const { timeframe = '30' } = req.query;

      const dashboard = await this.adverseEventService.getSAEDashboard(
        studyId,
        parseInt(timeframe as string)
      );

      res.json(dashboard);
    } catch (error) {
      logger.error('Error retrieving SAE dashboard:', error);
      res.status(500).json({ error: 'Failed to retrieve SAE dashboard' });
    }
  };

  // Get adverse event statistics
  public getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studyId } = req.params;
      const { period = 'month' } = req.query;

      const statistics = await this.adverseEventService.getStatistics(studyId, period as string);

      res.json(statistics);
    } catch (error) {
      logger.error('Error retrieving adverse event statistics:', error);
      res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
  };

  // Private helper methods
  private hasSignificantChanges(current: AdverseEvent, updated: AdverseEvent): boolean {
    // Define what constitutes significant changes that require reprocessing
    return (
      current.severity !== updated.severity ||
      current.seriousness !== updated.seriousness ||
      current.expectedness !== updated.expectedness ||
      current.relatedness !== updated.relatedness ||
      current.outcome !== updated.outcome
    );
  }
}