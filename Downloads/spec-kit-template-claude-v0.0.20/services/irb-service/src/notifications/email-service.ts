import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { logger } from '@research-study/shared';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user?: string;
    pass?: string;
  };
}

export class EmailService {
  private transporter: Transporter;

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: any[];
  }): Promise<boolean> {
    try {
      const mailOptions: SendMailOptions = {
        from: options.from || process.env.SMTP_FROM || 'noreply@research-study.org',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  async sendBulkEmails(emails: Array<{
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }>): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      const success = await this.sendEmail(email);
      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { sent, failed };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}