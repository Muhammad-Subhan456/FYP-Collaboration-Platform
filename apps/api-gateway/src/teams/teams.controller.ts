import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GatewayHttpService } from '../common/gateway-http.service';

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly gatewayHttpService: GatewayHttpService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createTeam(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.TEAM_SERVICE_URL}/teams`,
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getAllTeams(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.TEAM_SERVICE_URL}/teams`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  searchTeams(
    @Headers('authorization') authorization: string,
    @Query('domain') domain: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.TEAM_SERVICE_URL}/teams/search`,
      authorization,
      { domain },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-team')
  getMyTeam(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.TEAM_SERVICE_URL}/teams/my-team`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-team/members')
  getMyTeamMembers(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.TEAM_SERVICE_URL}/teams/my-team/members`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':teamId/join')
  requestToJoin(
    @Headers('authorization') authorization: string,
    @Param('teamId') teamId: string,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.TEAM_SERVICE_URL}/teams/${teamId}/join`,
      {},
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-team/requests')
  getMyTeamRequests(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.TEAM_SERVICE_URL}/teams/my-team/requests`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('requests/:requestId/approve')
  approveRequest(
    @Headers('authorization') authorization: string,
    @Param('requestId') requestId: string,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.TEAM_SERVICE_URL}/teams/requests/${requestId}/approve`,
      {},
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('requests/:requestId/reject')
  rejectRequest(
    @Headers('authorization') authorization: string,
    @Param('requestId') requestId: string,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.TEAM_SERVICE_URL}/teams/requests/${requestId}/reject`,
      {},
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('my-team/members/:memberId/role')
  updateMemberRole(
    @Headers('authorization') authorization: string,
    @Param('memberId') memberId: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.patch(
      `${process.env.TEAM_SERVICE_URL}/teams/my-team/members/${memberId}/role`,
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('member/:authUserId/team')
  getTeamForMember(
    @Headers('authorization') authorization: string,
    @Param('authUserId') authUserId: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.TEAM_SERVICE_URL}/teams/member/${authUserId}/team`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  getAllTeamsForCoordinator(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.TEAM_SERVICE_URL}/teams/all`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':teamId/members')
  getTeamMembers(
    @Headers('authorization') authorization: string,
    @Param('teamId') teamId: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.TEAM_SERVICE_URL}/teams/${teamId}/members`,
      authorization,
    );
  }
}
