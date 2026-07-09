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

  async send(message: EmailMessage): Promise<void> {
    const from =
      this.config.get<string>('SMTP_FROM') ??
      'FOASIS <no-reply@foasis.local>';

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
