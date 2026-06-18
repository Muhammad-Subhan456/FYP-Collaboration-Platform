import {
  Controller,
  Get,
  Headers,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GatewayHttpService } from '../common/gateway-http.service';

@Controller('me')
export class MeController {
  constructor(
    private readonly gatewayHttpService: GatewayHttpService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('team')
  getMyTeam(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.TEAM_SERVICE_URL}/teams/my-team`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('proposal')
  getMyProposal(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/my-proposal`,
      authorization,
    );
  }
}
