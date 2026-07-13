import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';

import { SkipWorkspace } from '../common/decorators/skip-workspace.decorator';
import { PrismaService } from '../prisma/prisma.service';

@SkipWorkspace()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Readiness probe — returns 503 when the database is unreachable
   * so orchestrators (Docker/K8s) do not route traffic to a broken instance.
   */
  @Get()
  async check() {
    const timestamp = new Date().toISOString();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const services = [
        {
          name: 'foasis-backend',
          status: 'ok',
          database: 'connected',
          timestamp,
        },
      ];

      return {
        status: 'ok',
        service: 'foasis-backend',
        database: 'connected',
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
