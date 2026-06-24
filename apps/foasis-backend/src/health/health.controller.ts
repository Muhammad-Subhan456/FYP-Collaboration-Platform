import { Controller, Get } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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
      const services = [
        {
          name: 'foasis-backend',
          status: 'error',
          database: 'disconnected',
          timestamp,
        },
      ];

      return {
        status: 'degraded',
        service: 'foasis-backend',
        database: 'disconnected',
        services,
        timestamp,
      };
    }
  }
}
