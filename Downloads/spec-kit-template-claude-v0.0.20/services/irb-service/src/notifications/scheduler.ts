import cron from 'node-cron';
import { NotificationService } from './notification-service';
import { logger } from '@research-study/shared';

export class NotificationScheduler {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(private notificationService: NotificationService) {}

  async start(): Promise<void> {
    try {
      // Schedule daily notifications check at 9 AM
      this.scheduleTask('daily-notifications', '0 9 * * *', async () => {
        logger.info('Running daily notification check');
        await this.notificationService.processScheduledNotifications();
      });

      // Schedule weekly compliance metrics check on Mondays at 8 AM
      this.scheduleTask('weekly-compliance', '0 8 * * 1', async () => {
        logger.info('Running weekly compliance check');
        await this.processWeeklyCompliance();
      });

      // Schedule monthly audit reminder on 1st of month at 10 AM
      this.scheduleTask('monthly-audit', '0 10 1 * *', async () => {
        logger.info('Running monthly audit reminder');
        await this.processMonthlyAudit();
      });

      // Schedule hourly check for urgent notifications
      this.scheduleTask('urgent-notifications', '0 * * * *', async () => {
        await this.processUrgentNotifications();
      });

      logger.info('Notification scheduler started successfully');
    } catch (error) {
      logger.error('Failed to start notification scheduler:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    for (const [name, task] of this.scheduledTasks) {
      task.stop();
      logger.info(`Stopped scheduled task: ${name}`);
    }
    this.scheduledTasks.clear();
    logger.info('Notification scheduler stopped');
  }

  private scheduleTask(name: string, cronExpression: string, taskFunction: () => Promise<void>): void {
    const task = cron.schedule(cronExpression, async () => {
      try {
        await taskFunction();
      } catch (error) {
        logger.error(`Scheduled task ${name} failed:`, error);
      }
    }, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'America/New_York'
    });

    this.scheduledTasks.set(name, task);
    logger.info(`Scheduled task ${name} with expression: ${cronExpression}`);
  }

  private async processWeeklyCompliance(): Promise<void> {
    // Weekly compliance processing would go here
    logger.info('Processing weekly compliance notifications');
  }

  private async processMonthlyAudit(): Promise<void> {
    // Monthly audit processing would go here
    logger.info('Processing monthly audit notifications');
  }

  private async processUrgentNotifications(): Promise<void> {
    // Check for urgent/immediate notifications that need to be sent
    // This could include SAE reporting, critical compliance issues, etc.
    logger.debug('Checking for urgent notifications');
  }
}