import {
  ProtocolDeviation,
  DeviationSeverity,
  DeviationStatus,
  NotificationTrigger
} from '@research-study/shared';
import { ProtocolDeviationService } from '../services/protocol-deviation.service';
import { NotificationService } from '../notifications/notification-service';
import { transaction } from '../utils/database';
import { logger } from '@research-study/shared';

export class ProtocolDeviationWorkflow {
  constructor(
    private protocolDeviationService: ProtocolDeviationService,
    private notificationService: NotificationService
  ) {}

  // Process new protocol deviation
  async processNewDeviation(deviationId: string): Promise<ProtocolDeviation> {
    return transaction(async (client) => {
      const deviation = await this.protocolDeviationService.getProtocolDeviationById(deviationId);
      if (!deviation) {
        throw new Error('Protocol deviation not found');
      }

      // Assess reporting requirements
      const reportingRequirements = this.assessReportingRequirements(deviation);

      // Update deviation with reporting requirements
      const updatedDeviation = await this.protocolDeviationService.updateProtocolDeviation(deviationId, {
        reportableToFDA: reportingRequirements.reportableToFDA,
        reportableToSponsor: reportingRequirements.reportableToSponsor,
        reportableToIRB: reportingRequirements.reportableToIRB
      });

      // Send notifications for significant deviations
      if (this.requiresImmediateNotification(updatedDeviation)) {
        await this.sendImmediateNotifications(updatedDeviation);
      }

      logger.info(`Processed new protocol deviation ${deviationId}`);
      return updatedDeviation;
    });
  }

  // Process deviation update
  async processDeviationUpdate(deviationId: string): Promise<ProtocolDeviation> {
    const deviation = await this.protocolDeviationService.getProtocolDeviationById(deviationId);
    if (!deviation) {
      throw new Error('Protocol deviation not found');
    }

    // Re-assess reporting requirements
    const reportingRequirements = this.assessReportingRequirements(deviation);

    // Update if requirements have changed
    await this.protocolDeviationService.updateProtocolDeviation(deviationId, {
      reportableToFDA: reportingRequirements.reportableToFDA,
      reportableToSponsor: reportingRequirements.reportableToSponsor,
      reportableToIRB: reportingRequirements.reportableToIRB
    });

    return deviation;
  }

  // Close deviation
  async closeDeviation(deviationId: string, reason: string, closedBy: string): Promise<ProtocolDeviation> {
    return transaction(async (client) => {
      const updatedDeviation = await this.protocolDeviationService.updateProtocolDeviation(deviationId, {
        status: DeviationStatus.CLOSED
      });

      logger.info(`Protocol deviation ${deviationId} closed: ${reason}`);
      return updatedDeviation;
    });
  }

  // Private helper methods
  private assessReportingRequirements(deviation: ProtocolDeviation): {
    reportableToFDA: boolean;
    reportableToSponsor: boolean;
    reportableToIRB: boolean;
  } {
    let reportableToFDA = false;
    let reportableToSponsor = false;
    let reportableToIRB = false;

    // Critical deviations always reported to IRB and sponsor
    if (deviation.severity === DeviationSeverity.CRITICAL) {
      reportableToIRB = true;
      reportableToSponsor = true;
    }

    // Major deviations affecting safety or data integrity
    if (deviation.severity === DeviationSeverity.MAJOR &&
        (deviation.impactOnParticipantSafety || deviation.impactOnDataIntegrity)) {
      reportableToIRB = true;
      reportableToSponsor = true;
    }

    // FDA reporting for significant protocol violations
    if (deviation.severity === DeviationSeverity.CRITICAL &&
        deviation.impactOnParticipantSafety) {
      reportableToFDA = true;
    }

    return { reportableToFDA, reportableToSponsor, reportableToIRB };
  }

  private requiresImmediateNotification(deviation: ProtocolDeviation): boolean {
    return (
      deviation.severity === DeviationSeverity.CRITICAL ||
      deviation.impactOnParticipantSafety
    );
  }

  private async sendImmediateNotifications(deviation: ProtocolDeviation): Promise<void> {
    await this.notificationService.sendNotification(
      NotificationTrigger.PROTOCOL_DEVIATION,
      {
        deviationId: deviation.id,
        studyId: deviation.studyId,
        deviationType: deviation.deviationType,
        severity: deviation.severity,
        impactOnSafety: deviation.impactOnParticipantSafety,
        urgent: true
      }
    );
  }
}