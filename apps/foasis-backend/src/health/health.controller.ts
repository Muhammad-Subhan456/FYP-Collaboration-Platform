import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';

import { SkipWorkspace } from '../common/decorators/skip-workspace.decorator';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

@SkipWorkspace()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Readiness probe — returns 503 when the database is unreachable
   * so orchestrators (Docker/K8s) do not route traffic to a broken instance.
   * Email status is informational (no outbound send).
   */
  @Get()
  async check() {
    const timestamp = new Date().toISOString();
    const email = this.emailService.getHealth();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const services = [
        {
          name: 'foasis-backend',
          status: 'ok',
          database: 'connected',
          timestamp,
        },
        {
          name: 'email',
          status: email.providerHealth.ready ? 'ok' : 'degraded',
          provider: email.provider,
          configured: email.providerHealth.configured,
          timestamp,
        },
      ];

      return {
        status: 'ok',
        service: 'foasis-backend',
        database: 'connected',
        email: {
          provider: email.provider,
          configured: email.providerHealth.configured,
          ready: email.providerHealth.ready,
        },
        services,
        timestamp,
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        service: 'foasis-backend',
        database: 'disconnected',
        services: [
          {
            name: 'foasis-backend',
            status: 'error',
            database: 'disconnected',
            timestamp,
          },
        ],
        timestamp,
      });
    }
  }
}
