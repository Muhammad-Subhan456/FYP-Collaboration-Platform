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
import { UpdateTeamDto } from './dto/update-team.dto';
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
    @Req() req: { user: { userId: string }; workspaceId: string },
    @Body() createTeamDto: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(
      req.user.userId,
      createTeamDto,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'COORDINATOR')
  @Get()
  getAllTeams(@Req() req: { workspaceId: string }) {
    return this.teamsService.getAllTeams(req.workspaceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('search')
  searchTeams(
    @Query('domain') domain: string,
    @Req() req: { workspaceId: string },
  ) {
    return this.teamsService.searchByDomain(
      domain,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('my-team')
  getMyTeam(
    @Req() req: { user: { userId: string }; workspaceId: string },
  ) {
    return this.teamsService.getMyTeam(
      req.user.userId,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('my-team/members')
  getMyTeamMembers(
    @Req() req: { user: { userId: string }; workspaceId: string },
  ) {
    return this.teamsService.getMyTeamMembers(
      req.user.userId,
      undefined,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('my-team/overview')
  getStudentTeamOverview(
    @Req() req: { user: { userId: string }; workspaceId: string },
  ) {
    return this.teamsService.getStudentTeamOverview(
      req.user.userId,
      req.workspaceId,
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
  @Get(':teamId/browse')
  getBrowseTeamDetails(
    @Param('teamId') teamId: string,
    @Req() req: { workspaceId: string },
  ) {
    return this.teamsService.getBrowseTeamDetails(
      teamId,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('my-team/requests')
  getMyTeamRequests(
    @Req() req: { user: { userId: string }; workspaceId: string },
  ) {
    return this.teamsService.getMyTeamRequests(
      req.user.userId,
      req.workspaceId,
    );
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
  @Patch('my-team')
  updateTeam(
    @Req() req: { user: { userId: string }; workspaceId: string },
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(
      req.user.userId,
      updateTeamDto,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('my-team/leave')
  leaveTeam(
    @Req() req: { user: { userId: string }; workspaceId: string },
  ) {
    return this.teamsService.leaveTeam(
      req.user.userId,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('my-team/delete')
  deleteTeam(
    @Req() req: { user: { userId: string }; workspaceId: string },
  ) {
    return this.teamsService.deleteTeam(
      req.user.userId,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Patch('my-team/members/:memberId/role')
  updateMemberRole(
    @Req() req: { user: { userId: string }; workspaceId: string },
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.teamsService.updateMemberRole(
      req.user.userId,
      memberId,
      dto.teamRole,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('my-team/members/:memberId/remove')
  removeMember(
    @Req() req: { user: { userId: string }; workspaceId: string },
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.removeMember(
      req.user.userId,
      memberId,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('member/:authUserId/team')
  getTeamForMember(
    @Param('authUserId') authUserId: string,
    @Req() req: { workspaceId: string },
  ) {
    return this.teamsService.getTeamContextForMember(
      authUserId,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('all')
  getAllTeamsForCoordinator(
    @Req() req: { workspaceId: string },
  ) {
    return this.teamsService.getAllTeamsForCoordinator(
      req.workspaceId,
    );
  }

  @UseGuards(InternalOrJwtAuthGuard)
  @Get(':teamId/members')
  getTeamMembers(
    @Param('teamId') teamId: string,
    @Req()
    req: {
      user?: { userId: string; role: string };
      workspaceId?: string;
      headers?: { 'x-workspace-id'?: string };
    },
  ) {
    const workspaceId =
      req.workspaceId ??
      req.headers?.['x-workspace-id'] ??
      undefined;

    return this.teamsService.getTeamMembersForRequester(
      teamId,
      req.user,
      workspaceId,
    );
  }
}
