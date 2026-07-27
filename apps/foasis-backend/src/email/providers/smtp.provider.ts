import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import type {
  EmailProvider,
  EmailProviderHealth,
  EmailSendPayload,
  EmailSendResult,
} from './email-provider.interface';

/**
 * Legacy SMTP provider retained for rollback via EMAIL_PROVIDER=smtp.
 */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp' as const;
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
    }
  }

  health(): EmailProviderHealth {
    if (!this.transporter) {
      return {
        name: this.name,
        configured: false,
        ready: false,
        detail: 'SMTP_HOST / SMTP_USER / SMTP_PASS not fully set',
      };
    }
    return {
      name: this.name,
      configured: true,
      ready: true,
    };
  }

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    if (!this.transporter) {
      throw new Error('SMTP provider is not configured');
    }

    const info = await this.transporter.sendMail({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      replyTo: payload.replyTo,
      headers: payload.idempotencyKey
        ? { 'X-Idempotency-Key': payload.idempotencyKey }
        : undefined,
    });

    return {
      providerMessageId:
        typeof info.messageId === 'string' ? info.messageId : undefined,
    };
  }
}
