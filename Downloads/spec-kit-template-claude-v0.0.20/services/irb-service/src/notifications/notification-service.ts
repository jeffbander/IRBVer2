import {
  NotificationTrigger,
  NotificationTemplate,
  Notification,
  NotificationStatus,
  NotificationType
} from '@research-study/shared';
import { EmailService } from './email-service';
import { query } from '../utils/database';
import { logger } from '@research-study/shared';
import { v4 as uuidv4 } from 'uuid';

export class NotificationService {
  constructor(private emailService: EmailService) {}

  // Send notification based on trigger event
  async sendNotification(
    trigger: NotificationTrigger,
    context: Record<string, any>
  ): Promise<void> {
    try {
      // Get active templates for this trigger
      const templates = await this.getTemplatesByTrigger(trigger);

      for (const template of templates) {
        await this.processTemplate(template, context);
      }
    } catch (error) {
      logger.error(`Failed to send notification for trigger ${trigger}:`, error);
    }
  }

  // Send notification to specific user
  async sendNotificationToUser(
    userId: string,
    templateName: string,
    context: Record<string, any>
  ): Promise<void> {
    try {
      const template = await this.getTemplateByName(templateName);
      if (!template) {
        logger.error(`Notification template not found: ${templateName}`);
        return;
      }

      await this.sendToUser(template, userId, context);
    } catch (error) {
      logger.error(`Failed to send notification to user ${userId}:`, error);
    }
  }

  // Create notification template
  async createTemplate(data: {
    name: string;
    type: NotificationType;
    subject: string;
    body: string;
    triggerEvent: NotificationTrigger;
    recipients: Array<{ type: 'ROLE' | 'USER' | 'EMAIL'; value: string }>;
  }): Promise<NotificationTemplate> {
    const id = uuidv4();
    const now = new Date();

    const result = await query(
      `INSERT INTO notification_templates (
        id, name, type, subject, body, trigger_event, active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [id, data.name, data.type, data.subject, data.body, data.triggerEvent, true, now, now]
    );

    const template = this.mapRowToTemplate(result.rows[0]);

    // Insert recipients
    for (const recipient of data.recipients) {
      await query(
        `INSERT INTO notification_recipients (id, template_id, type, value, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), id, recipient.type, recipient.value, now]
      );
    }

    return template;
  }

  // Get notifications for user
  async getNotificationsForUser(
    userId: string,
    options: {
      status?: NotificationStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    let whereClause = 'WHERE recipient_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (options.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM notifications ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get notifications
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const dataResult = await query(
      `SELECT * FROM notifications ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const notifications = dataResult.rows.map(row => this.mapRowToNotification(row));

    return { notifications, total };
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await query(
      `UPDATE notifications
       SET status = 'READ', read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND recipient_id = $2`,
      [notificationId, userId]
    );
  }

  // Mark all notifications as read for user
  async markAllAsRead(userId: string): Promise<void> {
    await query(
      `UPDATE notifications
       SET status = 'read', read_at = CURRENT_TIMESTAMP
       WHERE recipient_id = $1 AND status != 'read'`,
      [userId]
    );
  }

  // Process scheduled notifications
  async processScheduledNotifications(): Promise<void> {
    try {
      // Check for continuing reviews due
      await this.checkContinuingReviewsDue();

      // Check for document expirations
      await this.checkDocumentExpirations();

      // Check for overdue reviews
      await this.checkOverdueReviews();

      // Check for compliance alerts
      await this.checkComplianceAlerts();

    } catch (error) {
      logger.error('Failed to process scheduled notifications:', error);
    }
  }

  // Private methods
  private async getTemplatesByTrigger(trigger: NotificationTrigger): Promise<NotificationTemplate[]> {
    const result = await query(
      `SELECT t.*, array_agg(
         json_build_object('type', r.type, 'value', r.value)
       ) as recipients
       FROM notification_templates t
       LEFT JOIN notification_recipients r ON t.id = r.template_id
       WHERE t.trigger_event = $1 AND t.active = true
       GROUP BY t.id`,
      [trigger]
    );

    return result.rows.map(row => ({
      ...this.mapRowToTemplate(row),
      recipients: row.recipients.filter(r => r.type !== null)
    }));
  }

  private async getTemplateByName(name: string): Promise<NotificationTemplate | null> {
    const result = await query(
      `SELECT t.*, array_agg(
         json_build_object('type', r.type, 'value', r.value)
       ) as recipients
       FROM notification_templates t
       LEFT JOIN notification_recipients r ON t.id = r.template_id
       WHERE t.name = $1 AND t.active = true
       GROUP BY t.id`,
      [name]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...this.mapRowToTemplate(row),
      recipients: row.recipients.filter(r => r.type !== null)
    };
  }

  private async processTemplate(
    template: NotificationTemplate,
    context: Record<string, any>
  ): Promise<void> {
    for (const recipient of template.recipients) {
      if (recipient.type === 'ROLE') {
        await this.sendToRole(template, recipient.value, context);
      } else if (recipient.type === 'USER') {
        await this.sendToUser(template, recipient.value, context);
      } else if (recipient.type === 'EMAIL') {
        await this.sendToEmail(template, recipient.value, context);
      }
    }
  }

  private async sendToRole(
    template: NotificationTemplate,
    role: string,
    context: Record<string, any>
  ): Promise<void> {
    // Get users with this role (would query user service)
    // For now, mock implementation
    const users = await this.getUsersByRole(role);

    for (const user of users) {
      await this.sendToUser(template, user.id, context);
    }
  }

  private async sendToUser(
    template: NotificationTemplate,
    userId: string,
    context: Record<string, any>
  ): Promise<void> {
    const processedSubject = this.processTemplate(template.subject, context);
    const processedBody = this.processTemplate(template.body, context);

    // Create notification record
    const notificationId = uuidv4();
    await query(
      `INSERT INTO notifications (
        id, template_id, recipient_id, type, subject, message,
        status, entity_type, entity_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        notificationId,
        template.id,
        userId,
        template.type,
        processedSubject,
        processedBody,
        NotificationStatus.PENDING,
        context.entityType || null,
        context.entityId || null,
        new Date()
      ]
    );

    // Send based on type
    if (template.type === NotificationType.EMAIL) {
      const userEmail = await this.getUserEmail(userId);
      if (userEmail) {
        const sent = await this.emailService.sendEmail({
          to: userEmail,
          subject: processedSubject,
          html: processedBody
        });

        // Update notification status
        await query(
          `UPDATE notifications
           SET status = $1, sent_at = $2
           WHERE id = $3`,
          [sent ? NotificationStatus.SENT : NotificationStatus.FAILED, new Date(), notificationId]
        );
      }
    }
  }

  private async sendToEmail(
    template: NotificationTemplate,
    email: string,
    context: Record<string, any>
  ): Promise<void> {
    const processedSubject = this.processTemplate(template.subject, context);
    const processedBody = this.processTemplate(template.body, context);

    if (template.type === NotificationType.EMAIL) {
      await this.emailService.sendEmail({
        to: email,
        subject: processedSubject,
        html: processedBody
      });
    }
  }

  private processTemplate(template: string, context: Record<string, any>): string {
    let processed = template;

    // Replace placeholders like {{variable}}
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value));
    }

    return processed;
  }

  private async checkContinuingReviewsDue(): Promise<void> {
    const result = await query(
      `SELECT * FROM irb_submissions
       WHERE next_review_due <= CURRENT_DATE + INTERVAL '30 days'
       AND next_review_due > CURRENT_DATE
       AND status = 'APPROVED'`
    );

    for (const submission of result.rows) {
      await this.sendNotification(
        NotificationTrigger.CONTINUING_REVIEW_DUE,
        {
          submissionId: submission.id,
          studyId: submission.study_id,
          title: submission.title,
          dueDate: submission.next_review_due
        }
      );
    }
  }

  private async checkDocumentExpirations(): Promise<void> {
    const result = await query(
      `SELECT * FROM irb_documents
       WHERE expiration_date <= CURRENT_DATE + INTERVAL '30 days'
       AND expiration_date > CURRENT_DATE
       AND status = 'APPROVED'`
    );

    for (const document of result.rows) {
      await this.sendNotification(
        NotificationTrigger.DOCUMENT_EXPIRING,
        {
          documentId: document.id,
          title: document.title,
          expirationDate: document.expiration_date
        }
      );
    }
  }

  private async checkOverdueReviews(): Promise<void> {
    const result = await query(
      `SELECT s.*, r.reviewer_id
       FROM irb_submissions s
       JOIN irb_reviews r ON s.id = r.submission_id
       WHERE s.due_date < CURRENT_DATE
       AND r.status IN ('ASSIGNED', 'IN_PROGRESS')`
    );

    for (const review of result.rows) {
      await this.sendNotificationToUser(
        review.reviewer_id,
        'REVIEW_OVERDUE',
        {
          submissionId: review.id,
          title: review.title,
          dueDate: review.due_date
        }
      );
    }
  }

  private async checkComplianceAlerts(): Promise<void> {
    const result = await query(
      `SELECT * FROM compliance_metrics
       WHERE status IN ('NON_COMPLIANT', 'CRITICAL')
       AND last_measured > CURRENT_TIMESTAMP - INTERVAL '1 day'`
    );

    for (const metric of result.rows) {
      await this.sendNotification(
        NotificationTrigger.COMPLIANCE_ALERT,
        {
          metricId: metric.id,
          metricName: metric.name,
          currentValue: metric.current_value,
          status: metric.status
        }
      );
    }
  }

  private async getUsersByRole(role: string): Promise<Array<{ id: string; email: string }>> {
    // Mock implementation - would integrate with user service
    return [];
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    // Mock implementation - would integrate with user service
    return `user-${userId}@example.com`;
  }

  private mapRowToTemplate(row: any): NotificationTemplate {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      subject: row.subject,
      body: row.body,
      triggerEvent: row.trigger_event,
      recipients: row.recipients || [],
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      templateId: row.template_id,
      recipientId: row.recipient_id,
      type: row.type,
      subject: row.subject,
      message: row.message,
      status: row.status,
      sentAt: row.sent_at,
      readAt: row.read_at,
      entityType: row.entity_type,
      entityId: row.entity_id,
      createdAt: row.created_at
    };
  }
}