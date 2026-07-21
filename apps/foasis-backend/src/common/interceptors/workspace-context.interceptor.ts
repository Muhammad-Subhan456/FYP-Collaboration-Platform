import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, Subscription } from 'rxjs';

import { runWithWorkspaceContext } from '../../workspace/workspace-als';

@Injectable()
export class WorkspaceContextInterceptor
  implements NestInterceptor
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      workspaceId?: string;
    }>();

    const workspaceId = request.workspaceId;

    // Keep ALS active for the full Observable subscription — not only the
    // synchronous next.handle() call — so async controller work retains context.
    return new Observable((subscriber) => {
      let subscription: Subscription | undefined;

      runWithWorkspaceContext(workspaceId, () => {
        subscription = next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (error) => subscriber.error(error),
          complete: () => subscriber.complete(),
        });
      });

      return () => subscription?.unsubscribe();
    });
  }
}

