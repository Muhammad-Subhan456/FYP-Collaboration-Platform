import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import {
  loadEmailRuntimeConfig,
  type EmailRuntimeConfig,
} from './email.config';
import type { EmailMessage } from './email.templates';
import type { EmailProvider } from './providers/email-provider.interface';
import { EMAIL_PROVIDER } from './providers/email-provider.token';

function normalizeFrom(raw: string): string {
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

function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  const anyErr = error as Error & { statusCode?: number; status?: number };
  const code = anyErr.statusCode ?? anyErr.status;
  if (typeof code === 'number') {
    return code === 408 || code === 429 || code >= 500;
  }
  return /timeout|econnreset|econnrefused|network|temporar|rate.?limit|503|502|504|429/i.test(
    error.message,
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Application-facing email facade.
 *
 * Business services call only this class. Provider selection, retries,
 * timeouts, and logging stay here so a future queue worker can invoke
 * the same `send()` without changing callers.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly runtime: EmailRuntimeConfig;

  constructor(
    @Inject(EMAIL_PROVIDER)
    private readonly provider: EmailProvider,
  ) {
    this.runtime = loadEmailRuntimeConfig();
  }

  /** Non-sending readiness info for health endpoints. */
  getHealth() {
    const providerHealth = this.provider.health();
    return {
      provider: this.runtime.provider,
      fromConfigured: Boolean(this.runtime.from),
      timeoutMs: this.runtime.timeoutMs,
      retryCount: this.runtime.retryCount,
      providerHealth,
    };
  }

  /**
   * Deliver a transactional email.
   * Never throws provider secrets; logs structured metadata only.
   * Callers should invoke this AFTER DB commits so failures never roll back business state.
   */
  async send(message: EmailMessage): Promise<void> {
    const correlationId = randomUUID();
    const idempotencyKey = message.idempotencyKey ?? correlationId;
    const emailType = message.type ?? 'transactional';
    const from = normalizeFrom(this.runtime.from || 'FOASIS <no-reply@foasis.app>');
    const replyTo = message.replyTo ?? this.runtime.replyTo;

    const maxAttempts = Math.max(1, this.runtime.retryCount);
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const result = await this.sendWithTimeout({
          to: message.to,
          from,
          subject: message.subject,
          text: message.text,
          html: message.html,
          replyTo,
          idempotencyKey,
        });

        this.logger.log(
          JSON.stringify({
            event: 'email.sent',
            emailType,
            provider: this.provider.name,
            to: message.to,
            subject: message.subject,
            correlationId,
            attempt,
            providerMessageId: result.providerMessageId ?? null,
            timestamp: new Date().toISOString(),
          }),
        );
        return;
      } catch (error) {
        lastError = error;
        const transient = isTransientError(error);
        const reason =
          error instanceof Error ? error.message : 'unknown_error';

        this.logger.warn(
          JSON.stringify({
            event: 'email.send_failed',
            emailType,
            provider: this.provider.name,
            to: message.to,
            correlationId,
            attempt,
            maxAttempts,
            transient,
            reason,
            timestamp: new Date().toISOString(),
          }),
        );

        if (!transient || attempt >= maxAttempts) {
          break;
        }

        const backoff =
          this.runtime.retryBaseMs * 2 ** (attempt - 1);
        await sleep(backoff);
      }
    }

    this.logger.error(
      JSON.stringify({
        event: 'email.exhausted',
        emailType,
        provider: this.provider.name,
        to: message.to,
        correlationId,
        attempts: attempt,
        reason:
          lastError instanceof Error ? lastError.message : 'unknown_error',
        timestamp: new Date().toISOString(),
      }),
    );

    // Preserve prior behaviour for most callers (fire-and-forget): do not throw
    // after retries so business workflows are not corrupted. Password-reset and
    // invitation paths that await still get a settled promise; they already
    // treat delivery as best-effort where wrapped in try/catch.
    // For password reset which awaits without try/catch — throwing would fail
    // the HTTP request. Prefer not throwing after exhaustion to match SMTP
    // reliability expectations (user still sees generic success for forgot-password).
  }

  private async sendWithTimeout(
    payload: Parameters<EmailProvider['send']>[0],
  ) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.provider.send(payload),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`EMAIL_TIMEOUT after ${this.runtime.timeoutMs}ms`));
          }, this.runtime.timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
