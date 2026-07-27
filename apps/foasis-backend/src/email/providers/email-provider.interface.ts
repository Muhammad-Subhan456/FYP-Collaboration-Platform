export type EmailProviderName = 'resend' | 'smtp' | 'log';

export type EmailSendPayload = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Provider-level dedupe key for retries / duplicate requests. */
  idempotencyKey?: string;
};

export type EmailSendResult = {
  providerMessageId?: string;
};

export type EmailProviderHealth = {
  name: EmailProviderName;
  configured: boolean;
  ready: boolean;
  detail?: string;
};

/**
 * Provider abstraction — business code never depends on Resend/SMTP SDKs.
 * Swap providers via EMAIL_PROVIDER without touching callers.
 */
export interface EmailProvider {
  readonly name: EmailProviderName;
  send(payload: EmailSendPayload): Promise<EmailSendResult>;
  health(): EmailProviderHealth;
}
