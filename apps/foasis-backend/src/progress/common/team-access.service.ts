import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { AuthContextService } from '../../common/auth-context.service';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { ProposalsService } from '../../proposals/proposals.service';
import { TeamsService } from '../../teams/teams.service';
import { getWorkspaceIdFromContext } from '../../workspace/workspace-als';

import {
  NotificationPayload,
} from './notification-payload';

export type NotificationContext = Omit<
  NotificationPayload,
  'authUserId'
>;

@Injectable()
export class TeamAccessService {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly proposalsService: ProposalsService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly authContext: AuthContextService,
  ) {}

  async getMyTeam(authorization: string) {
    try {
      const authUserId =
        this.authContext.getUserIdFromAuthorization(
          authorization,
        );

      return this.teamsService.getMyTeam(
        authUserId,
        getWorkspaceIdFromContext(),
      );
    } catch {
      return null;
    }
  }

  async getMyTeamByUserId(
    authUserId: string,
    workspaceId?: string,
  ) {
    return this.teamsService.getMyTeam(
      authUserId,
      workspaceId ?? getWorkspaceIdFromContext(),
    );
  }

  async getTeamMembers(teamId: string) {
    return this.teamsService.getTeamMembers(teamId);
  }

  async assertTeamMember(
    teamId: string,
    authorization: string,
  ) {
    const team =
      await this.getMyTeam(authorization);

    if (!team?.id || team.id !== teamId) {
      throw new ForbiddenException(
        'You are not a member of this team',
      );
    }

    return team;
  }

  async getMyProposal(authorization: string) {
    try {
      const authUserId =
        this.authContext.getUserIdFromAuthorization(
          authorization,
        );

      return this.proposalsService.getMyProposalByUserId(
        authUserId,
      );
    } catch {
      return null;
    }
  }

  async getMyProposalByUserId(authUserId: string) {
    return this.proposalsService.getMyProposalByUserId(
      authUserId,
    );
  }

  private async getProposalByTeamIdInternal(
    teamId: string,
  ) {
    return this.proposalsService.getProposalByTeamId(
      teamId,
    );
  }

  async getAssignedSupervisorId(
    authorization: string,
  ): Promise<string | null> {
    try {
      const authUserId =
        this.authContext.getUserIdFromAuthorization(
          authorization,
        );

      return this.getAssignedSupervisorIdByUserId(
        authUserId,
      );
    } catch {
      return null;
    }
  }

  async getAssignedSupervisorIdByUserId(
    authUserId: string,
    proposal?: {
      assignedSupervisorId?: string | null;
    } | null,
  ): Promise<string | null> {
    if (proposal !== undefined) {
      return proposal?.assignedSupervisorId ?? null;
    }

    const proposalFromStudent =
      await this.getMyProposalByUserId(authUserId);

    return proposalFromStudent?.assignedSupervisorId ?? null;
  }

  async notifyTeamMembers(
    teamId: string,
    context: NotificationContext,
    options?: { excludeAuthUserId?: string },
  ): Promise<void> {
    try {
      const members = await this.getTeamMembers(teamId);

      const payloads = members
        .filter(
          (member) =>
            member.authUserId !== options?.excludeAuthUserId,
        )
        .map((member) => ({
          authUserId: member.authUserId,
          ...context,
        }));

      if (payloads.length === 0) {
        return;
      }

      await this.notificationDispatch.sendBulk(payloads);
    } catch {
      // Non-blocking
    }
  }

  async notifySupervisedTeamMembers(
    supervisorId: string,
    context: NotificationContext,
  ): Promise<void> {
    try {
      const proposals =
        await this.proposalsService.getSupervisedProposals(
          supervisorId,
        );

      for (const proposal of proposals) {
        await this.notifyTeamMembers(
          proposal.teamId,
          context,
        );
      }
    } catch {
      // Non-blocking
    }
  }

  async notifyAssignedSupervisor(
    teamId: string,
    context: NotificationContext,
  ): Promise<void> {
    try {
      const proposal =
        await this.proposalsService.getProposalByTeamId(
          teamId,
        );

      if (!proposal?.assignedSupervisorId) {
        return;
      }

      await this.notificationDispatch.send({
        authUserId: proposal.assignedSupervisorId,
        ...context,
      });
    } catch {
      // Non-blocking
    }
  }
}
