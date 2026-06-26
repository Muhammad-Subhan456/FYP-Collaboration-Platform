import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { recordQuery } from '../common/performance/query-perf';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const enableQueryPerf =
      process.env.PERF_LOG === 'true' ||
      process.env.npm_lifecycle_event === 'benchmark';

    super(
      enableQueryPerf
        ? {
            log: [
              { emit: 'event', level: 'query' },
            ],
          }
        : undefined,
    );
  }

  async onModuleInit() {
    const enableQueryPerf =
      process.env.PERF_LOG === 'true' ||
      process.env.npm_lifecycle_event === 'benchmark';

    if (enableQueryPerf) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).$on('query', (event: any) => {
        const query = String(event.query ?? '');
        const modelMatch = query.match(
          /FROM "public"\."(\w+)"/,
        );
        const model = modelMatch?.[1] ?? 'unknown';
        const operation =
          query.trim().split(/\s+/)[0]?.toUpperCase() ??
          'QUERY';

        recordQuery({
          model,
          operation,
          durationMs: Number(event.duration ?? 0),
          query,
        });
      });
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
