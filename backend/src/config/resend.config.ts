import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendConfigService {
  private resendClient: Resend;

  constructor() {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY must be defined in environment variables');
    }

    this.resendClient = new Resend(resendApiKey);
  }

  getClient(): Resend {
    return this.resendClient;
  }

  async sendEmail(to: string, subject: string, html: string, attachments?: any[]) {
    try {
      const response = await this.resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Sistema LogiTrack <onboarding@resend.dev>',
        to,
        subject,
        html,
        attachments,
      });

      return response;
    } catch (error) {
      throw new Error(`Email error: ${error.message}`);
    }
  }

  async sendEmailWithAttachment(
    to: string,
    subject: string,
    html: string,
    attachmentBase64: string,
    attachmentName: string,
  ) {
    try {
      const response = await this.resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Sistema LogiTrack <onboarding@resend.dev>',
        to,
        subject,
        html,
        attachments: [
          {
            filename: attachmentName,
            content: attachmentBase64,
          },
        ],
      });

      return response;
    } catch (error) {
      throw new Error(`Email with attachment error: ${error.message}`);
    }
  }
}
