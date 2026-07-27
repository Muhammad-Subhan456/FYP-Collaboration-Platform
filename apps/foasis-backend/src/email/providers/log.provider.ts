import { Injectable, Logger } from '@nestjs/common';

import type {
  EmailProvider,
  EmailProviderHealth,
  EmailSendPayload,
  EmailSendResult,
} from './email-provider.interface';

/**
 * Dev / missing-config provider: logs metadata only, never sends.
 */
@Injectable()
export class LogEmailProvider implements EmailProvider {
  readonly name = 'log' as const;
  private readonly logger = new Logger(LogEmailProvider.name);

  health(): EmailProviderHealth {
    return {
      name: this.name,
      configured: true,
      ready: true,
      detail: 'Log-only provider (no external delivery)',
    };
  }

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    this.logger.warn(
      `EMAIL_PROVIDER=log — email not delivered to=${payload.to} subject=${payload.subject}`,
    );
    return { providerMessageId: `log-${Date.now()}` };
  }
}
