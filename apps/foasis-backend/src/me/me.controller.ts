import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProposalsService } from '../proposals/proposals.service';
import { TeamsService } from '../teams/teams.service';

@Controller('me')
export class MeController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly proposalsService: ProposalsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('team')
  getMyTeam(
    @Req() req: { user: { userId: string }; workspaceId?: string },
  ) {
    return this.teamsService.getMyTeam(
      req.user.userId,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('proposal')
  getMyProposal(@Req() req: { user: { userId: string } }) {
    return this.proposalsService.getMyProposalByUserId(
      req.user.userId,
    );
  }
}
