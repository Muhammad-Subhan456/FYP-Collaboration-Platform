import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import type { AuthContextOption } from '../auth/auth.constants';
import { PrismaService } from '../prisma/prisma.service';

import { DEFAULT_WORKSPACE_ID } from './workspace.constants';

export type AuthenticatedRequestUser = {
  userId: string;
  email: string;
  role: UserRole;
  workspaceId?: string;
};

@Injectable()
export class WorkspaceContextService {
  constructor(private readonly prisma: PrismaService) {}

  isSuperAdmin(role: string) {
    return role === UserRole.SUPER_ADMIN;
  }

  async listActiveContexts(
    userId: string,
  ): Promise<AuthContextOption[]> {
    const memberships =
      await this.prisma.workspaceMembership.findMany({
        where: {
          userId,
          isActive: true,
          workspace: { isArchived: false },
        },
        include: {
          workspace: { select: { name: true } },
        },
        orderBy: [
          { workspace: { name: 'asc' } },
          { role: 'asc' },
        ],
      });

    return memberships.map((membership) => ({
      workspaceId: membership.workspaceId,
      workspaceName: membership.workspace.name,
      role: membership.role,
    }));
  }

  async resolveWorkspaceId(
    user: AuthenticatedRequestUser,
    explicitWorkspaceId?: string,
  ): Promise<string> {
    if (this.isSuperAdmin(user.role)) {
      throw new ForbiddenException(
        'Super Admin cannot access workspace-scoped resources',
      );
    }

    const workspaceId =
      explicitWorkspaceId ?? user.workspaceId ?? DEFAULT_WORKSPACE_ID;

    const membership =
      await this.prisma.workspaceMembership.findFirst({
        where: {
          workspaceId,
          userId: user.userId,
          role: user.role,
          isActive: true,
        },
      });

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this workspace context',
      );
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        isArchived: false,
      },
    });

    if (!workspace) {
      throw new ForbiddenException('Workspace is not available');
    }

    return workspaceId;
  }

  async resolveLoginContexts(userId: string, userRole: UserRole) {
    if (userRole === UserRole.SUPER_ADMIN) {
      return [];
    }

    return this.listActiveContexts(userId);
  }

  async ensureMembershipRole(
    userId: string,
    workspaceId: string,
    role: UserRole,
    allowedRoles: UserRole[],
  ) {
    const membership =
      await this.prisma.workspaceMembership.findUnique({
        where: {
          workspaceId_userId_role: {
            workspaceId,
            userId,
            role,
          },
        },
      });

    if (
      !membership?.isActive ||
      !allowedRoles.includes(membership.role)
    ) {
      throw new ForbiddenException('Insufficient workspace permissions');
    }

    return membership;
  }
}
