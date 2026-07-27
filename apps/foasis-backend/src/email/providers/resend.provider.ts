import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import type {
  EmailProvider,
  EmailProviderHealth,
  EmailSendPayload,
  EmailSendResult,
} from './email-provider.interface';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend' as const;
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly client: Resend | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  health(): EmailProviderHealth {
    if (!this.client) {
      return {
        name: this.name,
        configured: false,
        ready: false,
        detail: 'RESEND_API_KEY is not set',
      };
    }
    return {
      name: this.name,
      configured: true,
      ready: true,
    };
  }

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    if (!this.client) {
      throw new Error(
        'Resend provider is not configured (missing RESEND_API_KEY)',
      );
    }

    const { data, error } = await this.client.emails.send(
      {
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        ...(payload.html ? { html: payload.html } : {}),
        ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
      },
      payload.idempotencyKey
        ? { idempotencyKey: payload.idempotencyKey }
        : undefined,
    );

    if (error) {
      this.logger.warn(
        `Resend send failed: name=${error.name} message=${error.message}`,
      );
      const err = new Error(error.message) as Error & {
        statusCode?: number;
        name: string;
      };
      err.name = error.name ?? 'ResendError';
      if (
        error.name === 'rate_limit_exceeded' ||
        /rate|timeout|network|5\d\d|429|application_error|internal_server/i.test(
          `${error.name} ${error.message}`,
        )
      ) {
        err.statusCode = 503;
      }
      throw err;
    }

    return { providerMessageId: data?.id };
  }
}
