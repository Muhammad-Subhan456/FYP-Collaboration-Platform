import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { CompleteTeamIssueDto } from './dto/complete-team-issue.dto';
import { CreateTeamIssueCommentDto } from './dto/create-team-issue-comment.dto';
import { CreateTeamIssueDto } from './dto/create-team-issue.dto';
import { UpdateTeamIssueDto } from './dto/update-team-issue.dto';
import { TeamIssuesService } from './team-issues.service';

@Controller('team-issues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamIssuesController {
  constructor(
    private readonly teamIssuesService: TeamIssuesService,
  ) {}

  @Roles('STUDENT')
  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateTeamIssueDto,
  ) {
    return this.teamIssuesService.createIssue(
      req.user.userId,
      dto,
    );
  }

  @Roles('STUDENT')
  @Patch(':id')
  update(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateTeamIssueDto,
  ) {
    return this.teamIssuesService.updateIssue(
      id,
      req.user.userId,
      dto,
    );
  }

  @Roles('STUDENT')
  @Post(':id/claim')
  claim(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.teamIssuesService.claimIssue(
      id,
      req.user.userId,
    );
  }

  @Roles('STUDENT')
  @Post(':id/release')
  release(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.teamIssuesService.releaseIssue(
      id,
      req.user.userId,
    );
  }

  @Roles('STUDENT')
  @Post(':id/complete')
  complete(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: CompleteTeamIssueDto,
  ) {
    return this.teamIssuesService.completeIssue(
      id,
      req.user.userId,
      dto,
    );
  }

  @Roles('STUDENT', 'SUPERVISOR')
  @Post(':id/comments')
  comment(
    @Req() req: { user: { userId: string; role: string } },
    @Param('id') id: string,
    @Body() dto: CreateTeamIssueCommentDto,
  ) {
    return this.teamIssuesService.createComment(
      id,
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @Roles('COORDINATOR')
  @Get('by-user/:authUserId')
  getForUser(@Param('authUserId') authUserId: string) {
    return this.teamIssuesService.getIssuesForUser(authUserId);
  }

  @Roles('STUDENT', 'SUPERVISOR')
  @Get(':id')
  getOne(
    @Req() req: { user: { userId: string; role: string } },
    @Param('id') id: string,
  ) {
    return this.teamIssuesService.getIssue(
      id,
      req.user.userId,
      req.user.role,
    );
  }
}
