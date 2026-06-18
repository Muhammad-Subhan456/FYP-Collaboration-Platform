import { Controller, Get } from '@nestjs/common';
import axios from 'axios';

@Controller('health')
export class HealthController {
  @Get()
  async check() {
    const services = [
      { name: 'auth-service', url: process.env.AUTH_SERVICE_URL },
      { name: 'user-service', url: process.env.USER_SERVICE_URL },
      { name: 'team-service', url: process.env.TEAM_SERVICE_URL },
      { name: 'proposal-service', url: process.env.PROPOSAL_SERVICE_URL },
      { name: 'notification-service', url: process.env.NOTIFICATION_SERVICE_URL },
      { name: 'progress-service', url: process.env.PROGRESS_SERVICE_URL },
    ];

    const results = await Promise.all(
      services.map(async (service) => {
        try {
          const response = await axios.get(
            `${service.url}/health`,
            { timeout: 3000 },
          );

          return {
            name: service.name,
            ...response.data,
          };
        } catch {
          return {
            name: service.name,
            status: 'error',
            database: 'unknown',
          };
        }
      }),
    );

    const allHealthy = results.every(
      (result) => result.status === 'ok',
    );

    return {
      status: allHealthy ? 'ok' : 'degraded',
      service: 'api-gateway',
      services: results,
      timestamp: new Date().toISOString(),
    };
  }
}
