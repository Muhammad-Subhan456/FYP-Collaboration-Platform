import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppUrlsService {
  constructor(private readonly config: ConfigService) {}

  get frontendBaseUrl(): string {
    return (
      this.config.get<string>('FRONTEND_URL') ??
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  invitationUrl(token: string): string {
    return `${this.frontendBaseUrl}/auth/accept-invitation?token=${encodeURIComponent(token)}`;
  }

  passwordResetUrl(token: string): string {
    return `${this.frontendBaseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
  }
}
