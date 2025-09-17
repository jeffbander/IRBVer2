import {
  AdverseEvent,
  AESeverity,
  AESeriousness,
  AEExpectedness,
  AERelatedness,
  AEStatus,
  AEReportingTimeline,
  NotificationTrigger
} from '@research-study/shared';
import { AdverseEventService } from '../services/adverse-event.service';
import { NotificationService } from '../notifications/notification-service';
import { transaction } from '../utils/database';
import { logger } from '@research-study/shared';

export class AdverseEventWorkflow {
  constructor(
    private adverseEventService: AdverseEventService,
    private notificationService: NotificationService
  ) {}

  // Process new adverse event to determine reporting requirements
  async processNewAdverseEvent(adverseEventId: string): Promise<AdverseEvent> {
    return transaction(async (client) => {
      const adverseEvent = await this.adverseEventService.getAdverseEventById(adverseEventId);
      if (!adverseEvent) {
        throw new Error('Adverse event not found');
      }

      // Determine reporting requirements
      const reportingRequirements = this.assessReportingRequirements(adverseEvent);

      // Update adverse event with reporting requirements
      const updatedEvent = await this.adverseEventService.updateAdverseEvent(adverseEventId, {
        reportableToFDA: reportingRequirements.reportableToFDA,
        reportableToSponsor: reportingRequirements.reportableToSponsor,
        reportableToIRB: reportingRequirements.reportableToIRB,
        reportingTimeline: reportingRequirements.timeline,
        isSAE: reportingRequirements.isSAE
      });

      // Generate SAE report ID if SAE
      if (reportingRequirements.isSAE && !updatedEvent.saeReportId) {
        const saeReportId = await this.generateSAEReportId(updatedEvent);
        await this.adverseEventService.updateAdverseEvent(adverseEventId, { saeReportId });
      }

      // Send immediate notifications for critical events
      if (this.requiresImmediateNotification(updatedEvent)) {
        await this.sendImmediateNotifications(updatedEvent);
      }

      logger.info(`Processed new adverse event ${adverseEventId}, SAE: ${reportingRequirements.isSAE}`);
      return updatedEvent;
    });
  }

  // Process adverse event update
  async processAdverseEventUpdate(adverseEventId: string): Promise<AdverseEvent> {
    const adverseEvent = await this.adverseEventService.getAdverseEventById(adverseEventId);
    if (!adverseEvent) {
      throw new Error('Adverse event not found');
    }

    // Re-assess reporting requirements
    const reportingRequirements = this.assessReportingRequirements(adverseEvent);

    // Update if requirements have changed
    if (
      adverseEvent.reportableToFDA !== reportingRequirements.reportableToFDA ||
      adverseEvent.reportableToSponsor !== reportingRequirements.reportableToSponsor ||
      adverseEvent.reportableToIRB !== reportingRequirements.reportableToIRB ||
      adverseEvent.isSAE !== reportingRequirements.isSAE
    ) {
      await this.adverseEventService.updateAdverseEvent(adverseEventId, {
        reportableToFDA: reportingRequirements.reportableToFDA,
        reportableToSponsor: reportingRequirements.reportableToSponsor,
        reportableToIRB: reportingRequirements.reportableToIRB,
        reportingTimeline: reportingRequirements.timeline,
        isSAE: reportingRequirements.isSAE
      });

      // If newly classified as SAE, send notifications
      if (reportingRequirements.isSAE && !adverseEvent.isSAE) {
        await this.sendSAENotifications(adverseEvent);
      }
    }

    return this.adverseEventService.getAdverseEventById(adverseEventId)!;
  }

  // Submit adverse event for official reporting
  async submitAdverseEvent(adverseEventId: string, submittedBy: string): Promise<AdverseEvent> {
    return transaction(async (client) => {
      const adverseEvent = await this.adverseEventService.getAdverseEventById(adverseEventId);
      if (!adverseEvent) {
        throw new Error('Adverse event not found');
      }

      // Update status to reported
      const updatedEvent = await this.adverseEventService.updateAdverseEvent(adverseEventId, {
        status: AEStatus.REPORTED,
        reportedAt: new Date()
      });

      // Send regulatory notifications
      await this.sendRegulatoryNotifications(updatedEvent);

      // Schedule follow-up reminders if needed
      if (updatedEvent.isSAE) {
        await this.scheduleFollowUpReminders(updatedEvent);
      }

      logger.info(`Adverse event ${adverseEventId} submitted for reporting`);
      return updatedEvent;
    });
  }

  // Assess if SAE meets criteria for expedited reporting
  async assessExpeditedReporting(adverseEventId: string): Promise<{
    requiresExpedited: boolean;
    timeline: AEReportingTimeline;
    reasons: string[];
  }> {
    const adverseEvent = await this.adverseEventService.getAdverseEventById(adverseEventId);
    if (!adverseEvent) {
      throw new Error('Adverse event not found');
    }

    const reasons: string[] = [];
    let timeline = AEReportingTimeline.ROUTINE;
    let requiresExpedited = false;

    // Death or life-threatening events
    if (adverseEvent.severity === AESeverity.LIFE_THREATENING || adverseEvent.outcome === 'FATAL') {
      requiresExpedited = true;
      timeline = AEReportingTimeline.IMMEDIATE;
      reasons.push('Life-threatening or fatal event');
    }

    // Serious and unexpected events
    if (
      adverseEvent.isSAE &&
      adverseEvent.expectedness === AEExpectedness.UNEXPECTED &&
      timeline !== AEReportingTimeline.IMMEDIATE
    ) {
      requiresExpedited = true;
      timeline = AEReportingTimeline.EXPEDITED_7_DAY;
      reasons.push('Serious and unexpected');
    }

    // Serious and expected events
    if (
      adverseEvent.isSAE &&
      adverseEvent.expectedness === AEExpectedness.EXPECTED &&
      timeline === AEReportingTimeline.ROUTINE
    ) {
      requiresExpedited = true;
      timeline = AEReportingTimeline.EXPEDITED_15_DAY;
      reasons.push('Serious and expected');
    }

    return {
      requiresExpedited,
      timeline,
      reasons
    };
  }

  // Private helper methods
  private assessReportingRequirements(adverseEvent: AdverseEvent): {
    reportableToFDA: boolean;
    reportableToSponsor: boolean;
    reportableToIRB: boolean;
    timeline: AEReportingTimeline;
    isSAE: boolean;
  } {
    // Determine if event is SAE
    const isSAE = this.isSeriousAdverseEvent(adverseEvent);

    // FDA reporting requirements
    let reportableToFDA = false;
    if (isSAE && adverseEvent.expectedness === AEExpectedness.UNEXPECTED) {
      reportableToFDA = true;
    }

    // Sponsor reporting (typically all SAEs)
    const reportableToSponsor = isSAE;

    // IRB reporting (SAEs and certain non-serious events)
    let reportableToIRB = isSAE;
    if (adverseEvent.relatedness !== AERelatedness.UNRELATED && adverseEvent.medicallySignificant) {
      reportableToIRB = true;
    }

    // Determine timeline
    let timeline = AEReportingTimeline.ROUTINE;
    if (adverseEvent.severity === AESeverity.LIFE_THREATENING || adverseEvent.outcome === 'FATAL') {
      timeline = AEReportingTimeline.IMMEDIATE;
    } else if (isSAE && adverseEvent.expectedness === AEExpectedness.UNEXPECTED) {
      timeline = AEReportingTimeline.EXPEDITED_7_DAY;
    } else if (isSAE) {
      timeline = AEReportingTimeline.EXPEDITED_15_DAY;
    }

    return {
      reportableToFDA,
      reportableToSponsor,
      reportableToIRB,
      timeline,
      isSAE
    };
  }

  private isSeriousAdverseEvent(adverseEvent: AdverseEvent): boolean {
    // SAE criteria per ICH-GCP
    return (
      adverseEvent.seriousness === AESeriousness.SERIOUS ||
      adverseEvent.outcome === 'FATAL' ||
      adverseEvent.severity === AESeverity.LIFE_THREATENING ||
      adverseEvent.hospitalizations?.length > 0 ||
      adverseEvent.medicallySignificant
    );
  }

  private requiresImmediateNotification(adverseEvent: AdverseEvent): boolean {
    return (
      adverseEvent.severity === AESeverity.LIFE_THREATENING ||
      adverseEvent.outcome === 'FATAL' ||
      (adverseEvent.isSAE && adverseEvent.expectedness === AEExpectedness.UNEXPECTED)
    );
  }

  private async sendImmediateNotifications(adverseEvent: AdverseEvent): Promise<void> {
    await this.notificationService.sendNotification(
      NotificationTrigger.SAE_REPORTED,
      {
        adverseEventId: adverseEvent.id,
        studyId: adverseEvent.studyId,
        externalId: adverseEvent.externalId,
        severity: adverseEvent.severity,
        seriousness: adverseEvent.seriousness,
        expectedness: adverseEvent.expectedness,
        outcome: adverseEvent.outcome,
        isSAE: adverseEvent.isSAE,
        urgent: true
      }
    );
  }

  private async sendSAENotifications(adverseEvent: AdverseEvent): Promise<void> {
    await this.notificationService.sendNotification(
      NotificationTrigger.SAE_REPORTED,
      {
        adverseEventId: adverseEvent.id,
        studyId: adverseEvent.studyId,
        externalId: adverseEvent.externalId,
        severity: adverseEvent.severity,
        seriousness: adverseEvent.seriousness,
        expectedness: adverseEvent.expectedness,
        outcome: adverseEvent.outcome,
        isSAE: adverseEvent.isSAE
      }
    );
  }

  private async sendRegulatoryNotifications(adverseEvent: AdverseEvent): Promise<void> {
    // Send notifications to regulatory authorities if required
    if (adverseEvent.reportableToFDA) {
      // Send FDA notification
      logger.info(`Sending FDA notification for SAE ${adverseEvent.id}`);
    }

    if (adverseEvent.reportableToSponsor) {
      // Send sponsor notification
      logger.info(`Sending sponsor notification for SAE ${adverseEvent.id}`);
    }

    if (adverseEvent.reportableToIRB) {
      // Send IRB notification
      logger.info(`Sending IRB notification for adverse event ${adverseEvent.id}`);
    }
  }

  private async scheduleFollowUpReminders(adverseEvent: AdverseEvent): Promise<void> {
    // Schedule follow-up reminders based on event severity and timeline
    const followUpDays = this.getFollowUpSchedule(adverseEvent);

    for (const days of followUpDays) {
      // Schedule reminder (this would integrate with a job scheduler)
      logger.info(`Scheduling follow-up reminder for SAE ${adverseEvent.id} in ${days} days`);
    }
  }

  private getFollowUpSchedule(adverseEvent: AdverseEvent): number[] {
    // Different follow-up schedules based on severity
    if (adverseEvent.severity === AESeverity.LIFE_THREATENING || adverseEvent.outcome === 'FATAL') {
      return [1, 3, 7, 14, 30]; // More frequent follow-up for critical events
    } else if (adverseEvent.isSAE) {
      return [7, 14, 30]; // Standard SAE follow-up
    } else {
      return [30]; // Minimal follow-up for non-SAE
    }
  }

  private async generateSAEReportId(adverseEvent: AdverseEvent): Promise<string> {
    const year = new Date().getFullYear();
    const studyPrefix = adverseEvent.studyId.substring(0, 8);
    const timestamp = Date.now().toString().slice(-6);

    return `SAE-${year}-${studyPrefix}-${timestamp}`;
  }
}