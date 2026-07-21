import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import type { EmailMessage } from './email.templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  /**
   * Ensures the From header is a valid RFC 5322 address. Accepts a bare email
   * or a "Display Name email@x" value (missing angle brackets) and normalizes
   * it to "Display Name <email@x>" so providers like Gmail don't reject it.
   */
  private normalizeFrom(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.includes('<') && trimmed.includes('>')) {
      return trimmed;
    }
    const emailMatch = trimmed.match(/[^\s<>]+@[^\s<>]+/);
    if (!emailMatch) {
      return trimmed;
    }
    const email = emailMatch[0];
    const name = trimmed.slice(0, trimmed.indexOf(email)).trim();
    return name ? `${name} <${email}>` : email;
  }

  async send(message: EmailMessage): Promise<void> {
    const from = this.normalizeFrom(
      this.config.get<string>('SMTP_FROM') ??
        'FOASIS <no-reply@foasis.local>',
    );

    if (!this.transporter) {
      this.logger.warn(
        `SMTP not configured — email to ${message.to} logged only`,
      );
      this.logger.log(
        `[DEV EMAIL] To: ${message.to}\nSubject: ${message.subject}\n${message.text}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
