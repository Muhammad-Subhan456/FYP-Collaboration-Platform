import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { InternalOrJwtAuthGuard } from '../common/guards/internal-or-jwt-auth.guard';

import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
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

  @UseGuards(JwtAuthGuard)
  @Get()
  getAllTeams() {
    return this.teamsService.getAllTeams();
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  searchTeams(@Query('domain') domain: string) {
    return this.teamsService.searchByDomain(domain);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-team')
  getMyTeam(@Req() req: any) {
    return this.teamsService.getMyTeam(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-team/members')
  getMyTeamMembers(@Req() req: any) {
    return this.teamsService.getMyTeamMembers(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('my-team/overview')
  getStudentTeamOverview(@Req() req: any) {
    return this.teamsService.getStudentTeamOverview(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('my-team/requests')
  getMyTeamRequests(@Req() req: any) {
    return this.teamsService.getMyTeamRequests(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('requests/:requestId/approve')
  approveRequest(
    @Param('requestId') requestId: string,
    @Req() req: any,
  ) {
    return this.teamsService.approveRequest(
      requestId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('requests/:requestId/reject')
  rejectRequest(
    @Param('requestId') requestId: string,
    @Req() req: any,
  ) {
    return this.teamsService.rejectRequest(
      requestId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('my-team/leave')
  leaveTeam(@Req() req: any) {
    return this.teamsService.leaveTeam(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('my-team/delete')
  deleteTeam(@Req() req: any) {
    return this.teamsService.deleteTeam(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Patch('my-team/members/:memberId/role')
  updateMemberRole(
    @Req() req: any,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.teamsService.updateMemberRole(
      req.user.userId,
      memberId,
      dto.teamRole,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('member/:authUserId/team')
  getTeamForMember(@Param('authUserId') authUserId: string) {
    return this.teamsService.getTeamContextForMember(authUserId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('all')
  getAllTeamsForCoordinator() {
    return this.teamsService.getAllTeamsForCoordinator();
  }

  @UseGuards(InternalOrJwtAuthGuard)
  @Get(':teamId/members')
  getTeamMembers(@Param('teamId') teamId: string) {
    return this.teamsService.getTeamMembers(teamId);
  }
}
