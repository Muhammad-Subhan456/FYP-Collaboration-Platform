import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Absolute browser-facing URLs (invitation / reset / portal links).
 * Always from env — never hardcode a host/port.
 * Prefer FRONTEND_URL; otherwise the first CORS_ORIGIN entry.
 */
@Injectable()
export class AppUrlsService {
  constructor(private readonly config: ConfigService) {}

  get frontendBaseUrl(): string {
    const frontend = this.config.get<string>('FRONTEND_URL')?.trim();
    const corsFirst = (this.config.get<string>('CORS_ORIGIN') ?? '')
      .split(',')
      .map((value) => value.trim())
      .find(Boolean);

    const base = frontend || corsFirst;
    if (!base) {
      throw new Error(
        'FRONTEND_URL (or CORS_ORIGIN) must be set for invitation and portal links.',
      );
    }

    return base.replace(/\/$/, '');
  }

  invitationUrl(token: string): string {
    return `${this.frontendBaseUrl}/auth/accept-invitation?token=${encodeURIComponent(token)}`;
  }

  passwordResetUrl(token: string): string {
    return `${this.frontendBaseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
  }

  /** Absolute frontend URL for a portal path (e.g. `/student/proposal`). */
  portalUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.frontendBaseUrl}${normalized}`;
  }
}
