import {
  Controller,
  Get,
  Headers,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GatewayHttpService } from '../common/gateway-http.service';

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
}