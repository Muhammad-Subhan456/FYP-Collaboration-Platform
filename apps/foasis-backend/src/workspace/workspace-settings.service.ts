import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  WORKSPACE_SETTINGS_DEFAULTS,
  type WorkspaceSettings,
  supervisorRequestTtlMs,
} from './workspace-settings.defaults';

export type UpdateWorkspaceSettingsInput = Partial<WorkspaceSettings>;

@Injectable()
export class WorkspaceSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalize(settings: WorkspaceSettings): WorkspaceSettings {
    return {
      teamMaxMembers: Math.max(
        1,
        Math.floor(settings.teamMaxMembers || WORKSPACE_SETTINGS_DEFAULTS.teamMaxMembers),
      ),
      supervisorMaxTeams: Math.max(
        1,
        Math.floor(
          settings.supervisorMaxTeams ||
            WORKSPACE_SETTINGS_DEFAULTS.supervisorMaxTeams,
        ),
      ),
      supervisorRequestExpiryHours: Math.max(
        1,
        Math.floor(
          settings.supervisorRequestExpiryHours ||
            WORKSPACE_SETTINGS_DEFAULTS.supervisorRequestExpiryHours,
        ),
      ),
    };
  }

  async getSettings(workspaceId: string): Promise<WorkspaceSettings> {
    if (!workspaceId) {
      return { ...WORKSPACE_SETTINGS_DEFAULTS };
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        teamMaxMembers: true,
        supervisorMaxTeams: true,
        supervisorRequestExpiryHours: true,
      },
    });

    if (!workspace) {
      return { ...WORKSPACE_SETTINGS_DEFAULTS };
    }

    return this.normalize({
      teamMaxMembers: workspace.teamMaxMembers,
      supervisorMaxTeams: workspace.supervisorMaxTeams,
      supervisorRequestExpiryHours: workspace.supervisorRequestExpiryHours,
    });
  }

  async updateSettings(
    workspaceId: string,
    input: UpdateWorkspaceSettingsInput,
  ): Promise<WorkspaceSettings> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, isArchived: true },
    });

    if (!workspace || workspace.isArchived) {
      throw new NotFoundException('Workspace not found');
    }

    const current = await this.getSettings(workspaceId);
    const next = this.normalize({
      teamMaxMembers: input.teamMaxMembers ?? current.teamMaxMembers,
      supervisorMaxTeams:
        input.supervisorMaxTeams ?? current.supervisorMaxTeams,
      supervisorRequestExpiryHours:
        input.supervisorRequestExpiryHours ??
        current.supervisorRequestExpiryHours,
    });

    if (
      input.teamMaxMembers !== undefined &&
      (!Number.isFinite(input.teamMaxMembers) || input.teamMaxMembers < 1)
    ) {
      throw new BadRequestException(
        'Team size must be a positive whole number',
      );
    }
    if (
      input.supervisorMaxTeams !== undefined &&
      (!Number.isFinite(input.supervisorMaxTeams) ||
        input.supervisorMaxTeams < 1)
    ) {
      throw new BadRequestException(
        'Supervisor teams limit must be a positive whole number',
      );
    }
    if (
      input.supervisorRequestExpiryHours !== undefined &&
      (!Number.isFinite(input.supervisorRequestExpiryHours) ||
        input.supervisorRequestExpiryHours < 1)
    ) {
      throw new BadRequestException(
        'Expiry time must be at least 1 hour',
      );
    }

    const expiryChanged =
      next.supervisorRequestExpiryHours !==
      current.supervisorRequestExpiryHours;

    await this.prisma.$transaction(async (tx) => {
      await tx.workspace.update({
        where: { id: workspaceId },
        data: {
          teamMaxMembers: next.teamMaxMembers,
          supervisorMaxTeams: next.supervisorMaxTeams,
          supervisorRequestExpiryHours: next.supervisorRequestExpiryHours,
        },
      });

      if (expiryChanged) {
        const ttlMs = supervisorRequestTtlMs(
          next.supervisorRequestExpiryHours,
        );
        const pending = await tx.proposal.findMany({
          where: {
            workspaceId,
            status: 'PENDING_SUPERVISOR',
            assignedSupervisorId: null,
            pendingExpiresAt: { not: null },
          },
          select: {
            id: true,
            createdAt: true,
            reviewedAt: true,
            pendingSupervisorId: true,
          },
        });

        for (const proposal of pending) {
          // Anchor to when the pending window started (updatedAt often drifts).
          const request = await tx.supervisorRequest.findFirst({
            where: {
              proposalId: proposal.id,
              status: 'PENDING',
            },
            select: { id: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          });
          const startedAt = request?.createdAt ?? proposal.createdAt;
          const pendingExpiresAt = new Date(startedAt.getTime() + ttlMs);

          await tx.proposal.update({
            where: { id: proposal.id },
            data: { pendingExpiresAt },
          });

          if (request) {
            await tx.supervisorRequest.update({
              where: { id: request.id },
              data: { expiresAt: pendingExpiresAt },
            });
          }
        }
      }
    });

    return next;
  }

  async getSupervisorRequestTtlMs(workspaceId: string): Promise<number> {
    const settings = await this.getSettings(workspaceId);
    return supervisorRequestTtlMs(settings.supervisorRequestExpiryHours);
  }
}
