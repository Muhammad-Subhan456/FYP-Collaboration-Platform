import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

import { securityConfig } from '../common/security.config';

type AttemptState = {
  failures: number;
  lockedUntil: number;
};

/**
 * In-memory per-account login backoff (exponential).
 * Suitable for a single-node monolith; replace with Redis for multi-instance.
 */
@Injectable()
export class LoginAttemptService {
  private readonly logger = new Logger(LoginAttemptService.name);
  private readonly attempts = new Map<string, AttemptState>();

  private key(email: string) {
    return email.trim().toLowerCase();
  }

  assertNotLocked(email: string): void {
    const state = this.attempts.get(this.key(email));
    if (!state) return;

    const remainingMs = state.lockedUntil - Date.now();
    if (remainingMs <= 0) {
      return;
    }

    const retryAfterSec = Math.max(1, Math.ceil(remainingMs / 1000));
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many failed login attempts. Please try again later.',
        error: 'Too Many Requests',
        retryAfter: retryAfterSec,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  recordFailure(email: string): void {
    const key = this.key(email);
    const prev = this.attempts.get(key) ?? { failures: 0, lockedUntil: 0 };
    const failures = prev.failures + 1;

    let lockedUntil = 0;
    if (failures >= securityConfig.loginMaxFailures) {
      const excess = failures - securityConfig.loginMaxFailures;
      const backoff = Math.min(
        securityConfig.loginBackoffMaxMs,
        securityConfig.loginBackoffBaseMs * 2 ** excess,
      );
      lockedUntil = Date.now() + backoff;
      this.logger.warn(
        `Login backoff engaged failures=${failures} backoffMs=${backoff}`,
      );
    }

    this.attempts.set(key, { failures, lockedUntil });
  }

  recordSuccess(email: string): void {
    this.attempts.delete(this.key(email));
  }
}
