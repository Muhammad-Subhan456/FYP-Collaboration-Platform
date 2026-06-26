import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, firstValueFrom } from 'rxjs';

import { runWithQueryPerf } from './query-perf';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (process.env.PERF_LOG !== 'true') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const start = performance.now();
    const method = request.method;
    const path = request.url;

    return new Observable((subscriber) => {
      runWithQueryPerf(async () =>
        firstValueFrom(next.handle()),
      )
        .then(({ result, perf }) => {
          const totalMs = performance.now() - start;
          const overheadMs = Math.max(
            0,
            totalMs - perf.totalDbMs,
          );

          console.log(
            [
              `\n[PERF] ${method} ${path}`,
              `  Total: ${totalMs.toFixed(1)}ms`,
              `  DB queries: ${perf.queryCount} (${perf.totalDbMs.toFixed(1)}ms cumulative)`,
              `  Non-DB overhead: ${overheadMs.toFixed(1)}ms`,
            ].join('\n'),
          );

          subscriber.next(result);
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }
}
