import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TeamAccessService {
  constructor(
    private readonly httpService: HttpService,
  ) {}

  private internalHeaders() {
    return {
      'X-Internal-Api-Key':
        process.env.INTERNAL_API_KEY,
    };
  }

  private authHeaders(authorization: string) {
    return { Authorization: authorization };
  }

  async getMyTeam(authorization: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${process.env.TEAM_SERVICE_URL}/teams/my-team`,
          {
            headers: this.authHeaders(authorization),
          },
        ),
      );

      return response.data;
    } catch {
      return null;
    }
  }

  async getTeamMembers(teamId: string) {
    const response = await firstValueFrom(
      this.httpService.get(
        `${process.env.TEAM_SERVICE_URL}/teams/${teamId}/members`,
        {
          headers: this.internalHeaders(),
        },
      ),
    );

    return response.data;
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
    if (!process.env.PROPOSAL_SERVICE_URL) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${process.env.PROPOSAL_SERVICE_URL}/proposals/my-proposal`,
          { headers: this.authHeaders(authorization) },
        ),
      );

      return response.data;
    } catch {
      return null;
    }
  }

  private async getProposalByTeamIdInternal(
    teamId: string,
  ) {
    if (!process.env.PROPOSAL_SERVICE_URL) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${process.env.PROPOSAL_SERVICE_URL}/proposals/internal/team/${teamId}`,
          { headers: this.internalHeaders() },
        ),
      );

      return response.data;
    } catch {
      return null;
    }
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
    title: string,
    message: string,
  ): Promise<void> {
    if (!process.env.NOTIFICATION_SERVICE_URL) {
      return;
    }

    try {
      const members = await this.getTeamMembers(teamId);

      for (const member of members) {
        await firstValueFrom(
          this.httpService.post(
            `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
            {
              authUserId: member.authUserId,
              title,
              message,
            },
            { headers: this.internalHeaders() },
          ),
        );
      }
    } catch {
      // Non-blocking
    }
  }

  async notifySupervisedTeamMembers(
    supervisorId: string,
    title: string,
    message: string,
  ): Promise<void> {
    if (!process.env.PROPOSAL_SERVICE_URL) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${process.env.PROPOSAL_SERVICE_URL}/proposals/supervised/${supervisorId}`,
          { headers: this.internalHeaders() },
        ),
      );

      for (const proposal of response.data ?? []) {
        await this.notifyTeamMembers(
          proposal.teamId,
          title,
          message,
        );
      }
    } catch {
      // Non-blocking
    }
  }
}
