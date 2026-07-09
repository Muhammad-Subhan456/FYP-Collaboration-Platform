import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

import { SKIP_WORKSPACE_KEY } from '../decorators/skip-workspace.decorator';
import {
  AuthenticatedRequestUser,
  WorkspaceContextService,
} from '../../workspace/workspace-context.service';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly jwtService: JwtService,
  ) {}

  private resolveRequestUser(
    request: {
      user?: AuthenticatedRequestUser;
      headers?: { authorization?: string };
    },
  ): AuthenticatedRequestUser | null {
    if (request.user) {
      return request.user;
    }

    const authHeader = request.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: UserRole;
        workspaceId?: string | null;
      }>(authHeader.slice(7));

      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        workspaceId: payload.workspaceId ?? undefined,
      };
    } catch {
      return null;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_WORKSPACE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = this.resolveRequestUser(request);

    if (!user) {
      return true;
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Super Admin cannot access workspace data',
      );
    }

    const workspaceId =
      await this.workspaceContext.resolveWorkspaceId(user);

    request.workspaceId = workspaceId;
    return true;
  }
}
