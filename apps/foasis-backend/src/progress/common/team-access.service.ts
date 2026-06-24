import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { AuthContextService } from '../../common/auth-context.service';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { ProposalsService } from '../../proposals/proposals.service';
import { TeamsService } from '../../teams/teams.service';

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

      return this.teamsService.getMyTeam(authUserId);
    } catch {
      return null;
    }
  }

  async getMyTeamByUserId(authUserId: string) {
    return this.teamsService.getMyTeam(authUserId);
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
    const proposalFromStudent =
      await this.getMyProposal(authorization);

    if (proposalFromStudent?.assignedSupervisorId) {
      return proposalFromStudent.assignedSupervisorId;
    }

    const team = await this.getMyTeam(authorization);
    if (!team?.id) {
      return null;
    }

    const proposal =
      await this.getProposalByTeamIdInternal(team.id);

    return proposal?.assignedSupervisorId ?? null;
  }

  async notifyTeamMembers(
    teamId: string,
    context: NotificationContext,
  ): Promise<void> {
    try {
      const members =
        await this.getTeamMembers(teamId);

      await Promise.allSettled(
        members.map((member) =>
          this.notificationDispatch.send({
            authUserId: member.authUserId,
            ...context,
          }),
        ),
      );
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
}
