import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateTeamDto } from './dto/create-team.dto';
import { TeamsService } from './teams.service';
import { Get, Query } from '@nestjs/common';
import { Param } from '@nestjs/common';


@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createTeam(
    @Req() req: any,
    @Body() createTeamDto: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(
      req.user.userId,
      createTeamDto,
    );
  }

  @Get()
getAllTeams() {
  return this.teamsService.getAllTeams();
}

@Get('search')
searchTeams(
  @Query('domain') domain: string,
) {
  return this.teamsService.searchByDomain(
    domain,
  );
}

@UseGuards(JwtAuthGuard)
@Get('my-team')
getMyTeam(@Req() req: any) {
  return this.teamsService.getMyTeam(
    req.user.userId,
  );
}

@UseGuards(JwtAuthGuard)
@Post(':teamId/join')
requestToJoin(
  @Param('teamId') teamId: string,
  @Req() req: any,
) {
  return this.teamsService.requestToJoin(
    teamId,
    req.user.userId,
  );
}

@UseGuards(JwtAuthGuard)
@Get('my-team/requests')
getMyTeamRequests(
  @Req() req: any,
) {
  return this.teamsService.getMyTeamRequests(
    req.user.userId,
  );
}

@UseGuards(JwtAuthGuard)
@Post('requests/:requestId/approve')
approveRequest(
  @Param('requestId')
  requestId: string,

  @Req() req: any,
) {
  return this.teamsService.approveRequest(
    requestId,
    req.user.userId,
  );
}

@UseGuards(JwtAuthGuard)
@Post('requests/:requestId/reject')
rejectRequest(
  @Param('requestId')
  requestId: string,

  @Req() req: any,
) {
  return this.teamsService.rejectRequest(
    requestId,
    req.user.userId,
  );
}

@Get(':teamId/members')
getTeamMembers(
  @Param('teamId') teamId: string,
) {
  return this.teamsService.getTeamMembers(
    teamId,
  );
}

}