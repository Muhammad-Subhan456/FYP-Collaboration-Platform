import {
  ForbiddenException,
  Injectable,
  BadRequestException,
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

  async getMyTeam(authorization: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${process.env.TEAM_SERVICE_URL}/teams/my-team`,
          {
            headers: { authorization },
          },
        ),
      );

      return response.data;
    } catch {
      throw new BadRequestException(
        'User does not belong to any team',
      );
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

    if (team.id !== teamId) {
      throw new ForbiddenException(
        'You are not a member of this team',
      );
    }

    return team;
  }

  async getMyProposal(authorization: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${process.env.PROPOSAL_SERVICE_URL}/proposals/my-proposal`,
          { headers: { authorization } },
        ),
      );

      return response.data;
    } catch {
      throw new BadRequestException(
        'Proposal not found for your team',
      );
    }
  }

  async getAssignedSupervisorId(
    authorization: string,
  ): Promise<string | null> {
    try {
      const proposal =
        await this.getMyProposal(authorization);

      return proposal.assignedSupervisorId ?? null;
    } catch {
      return null;
    }
  }
}
