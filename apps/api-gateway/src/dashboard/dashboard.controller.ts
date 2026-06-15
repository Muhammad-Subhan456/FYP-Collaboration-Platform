import {
  Controller,
  Get,
  Headers,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GatewayHttpService } from '../common/gateway-http.service';
import { Roles } from '../auth/decorators/roles.decorator';

import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly gatewayHttpService: GatewayHttpService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getDashboard(
    @Headers('authorization')
    authorization: string,
  ) {
    // Run independent calls in parallel
    const [profile, team] = await Promise.all([
      this.gatewayHttpService.get(
        `${process.env.USER_SERVICE_URL}/profiles/me`,
        authorization,
      ),

      this.gatewayHttpService.get(
        `${process.env.TEAM_SERVICE_URL}/teams/my-team`,
        authorization,
      ),
    ]);

    let proposal = null;

    try {
      proposal = await this.gatewayHttpService.get(
        `${process.env.PROPOSAL_SERVICE_URL}/proposals/my-proposal`,
        authorization,
        {
          teamId: team.id,
        },
      );
    } catch {
      proposal = null;
    }

    return {
      profile,
      team,
      proposal,
    };
  }

@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles('COORDINATOR')
@Get('coordinator')
async getCoordinatorDashboard(
  @Headers('authorization')
  authorization: string,
) {
  const [
    userStats,
    teams,
    proposalStats,
  ] = await Promise.all([
    this.gatewayHttpService.get(
      `${process.env.AUTH_SERVICE_URL}/auth/stats`,
      authorization,
    ),

    this.gatewayHttpService.get(
      `${process.env.TEAM_SERVICE_URL}/teams/all`,
      authorization,
    ),

    this.gatewayHttpService.get(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/stats`,
      authorization,
    ),
  ]);

  return {
    users: userStats,

    totalTeams: teams.length,

    proposals: proposalStats,
  };
}

}