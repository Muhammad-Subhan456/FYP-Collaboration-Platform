import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

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

    return runWithWorkspaceContext(request.workspaceId, () =>
      next.handle(),
    );
  }
}

