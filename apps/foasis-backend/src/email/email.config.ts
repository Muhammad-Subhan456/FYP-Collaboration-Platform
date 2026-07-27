import type { EmailProviderName } from './providers/email-provider.interface';

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export type EmailRuntimeConfig = {
  provider: EmailProviderName;
  from: string;
  replyTo?: string;
  timeoutMs: number;
  retryCount: number;
  retryBaseMs: number;
};

export function resolveEmailProviderName(): EmailProviderName {
  const raw = (process.env.EMAIL_PROVIDER ?? 'resend').trim().toLowerCase();
  if (raw === 'smtp' || raw === 'log' || raw === 'resend') {
    return raw;
  }
  throw new Error(
    `Invalid EMAIL_PROVIDER="${raw}". Expected resend | smtp | log.`,
  );
}

export function loadEmailRuntimeConfig(): EmailRuntimeConfig {
  const provider = resolveEmailProviderName();
  const from =
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    '';

  return {
    provider,
    from,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
    timeoutMs: intEnv('EMAIL_TIMEOUT_MS', 5_000),
    retryCount: intEnv('EMAIL_RETRY_COUNT', 3),
    retryBaseMs: intEnv('EMAIL_RETRY_BASE_MS', 500),
  };
}

/**
 * Fail-fast validation for the active email provider.
 * Called from bootstrap so misconfiguration never reaches production traffic.
 */
export function assertEmailConfig(): void {
  const config = loadEmailRuntimeConfig();

  if (config.provider === 'log') {
    return;
  }

  if (!config.from) {
    throw new Error(
      'EMAIL_FROM is required when EMAIL_PROVIDER is resend or smtp (e.g. FOASIS <no-reply@foasis.app>).',
    );
  }

  if (config.provider === 'resend') {
    const key = process.env.RESEND_API_KEY?.trim();
    if (!key) {
      throw new Error(
        'RESEND_API_KEY is required when EMAIL_PROVIDER=resend.',
      );
    }
  }

  if (config.provider === 'smtp') {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      throw new Error(
        'SMTP_HOST, SMTP_USER, and SMTP_PASS are required when EMAIL_PROVIDER=smtp.',
      );
    }
  }
}
