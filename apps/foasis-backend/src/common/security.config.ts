/**
 * Security thresholds — all overridable via environment variables.
 * Defaults are production-sensible; never hardcode secrets here.
 */

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === '') return fallback;
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  return fallback;
}

/** Example / placeholder secrets that must never be used in production. */
export const WEAK_SECRET_PATTERNS: RegExp[] = [
  /^change-me/i,
  /change-me-to-a-long-random-secret/i,
  /your[_-]?secret/i,
  /example/i,
  /^secret$/i,
  /^password/i,
  /^test$/i,
  /^dev[_-]?secret/i,
];

export function isWeakSecret(value: string | undefined | null): boolean {
  const secret = value?.trim() ?? '';
  if (!secret) return true;
  return WEAK_SECRET_PATTERNS.some((pattern) => pattern.test(secret));
}

export const securityConfig = {
  /** bcrypt effective max; longer inputs waste CPU and are truncated anyway. */
  passwordMaxLength: intEnv('AUTH_PASSWORD_MAX_LENGTH', 72),
  passwordMinLength: intEnv('AUTH_PASSWORD_MIN_LENGTH', 8),

  globalThrottleLimit: intEnv('THROTTLE_LIMIT', 120),
  globalThrottleTtlMs: intEnv('THROTTLE_TTL_MS', 60_000),

  authLoginRateLimit: intEnv('AUTH_LOGIN_RATE_LIMIT', 10),
  authLoginRateTtlMs: intEnv('AUTH_LOGIN_RATE_TTL_MS', 60_000),
  authRegisterRateLimit: intEnv('AUTH_REGISTER_RATE_LIMIT', 5),
  authRegisterRateTtlMs: intEnv('AUTH_REGISTER_RATE_TTL_MS', 60_000),
  authPasswordResetRateLimit: intEnv('AUTH_PASSWORD_RESET_RATE_LIMIT', 5),
  authPasswordResetRateTtlMs: intEnv(
    'AUTH_PASSWORD_RESET_RATE_TTL_MS',
    60_000,
  ),
  authSelectContextRateLimit: intEnv('AUTH_SELECT_CONTEXT_RATE_LIMIT', 20),
  authSelectContextRateTtlMs: intEnv(
    'AUTH_SELECT_CONTEXT_RATE_TTL_MS',
    60_000,
  ),
  invitationRateLimit: intEnv('AUTH_INVITATION_RATE_LIMIT', 10),
  invitationRateTtlMs: intEnv('AUTH_INVITATION_RATE_TTL_MS', 60_000),

  /** Per-account failed logins before exponential backoff starts. */
  loginMaxFailures: intEnv('AUTH_LOGIN_MAX_FAILURES', 5),
  loginBackoffBaseMs: intEnv('AUTH_LOGIN_BACKOFF_BASE_MS', 2_000),
  loginBackoffMaxMs: intEnv('AUTH_LOGIN_BACKOFF_MAX_MS', 900_000),

  profilesBatchMaxIds: intEnv('PROFILES_BATCH_MAX_IDS', 100),

  wsMaxConnectionsPerUser: intEnv('WS_MAX_CONNECTIONS_PER_USER', 5),
  /** Query-string WS tokens leak via proxies/logs; off in production by default. */
  allowWsQueryToken: boolEnv(
    'ALLOW_WS_QUERY_TOKEN',
    process.env.NODE_ENV !== 'production',
  ),
} as const;
