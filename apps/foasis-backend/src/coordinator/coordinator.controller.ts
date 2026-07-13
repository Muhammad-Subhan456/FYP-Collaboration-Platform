import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsQueryDto } from '../notifications/dto/notifications-query.dto';

import { CoordinatorSubmissionsService } from './coordinator-submissions.service';
import { CoordinatorPagesService } from './coordinator-pages.service';
import { GetFinalizedSubmissionsQueryDto } from './dto/get-finalized-submissions-query.dto';
import { SendSubmissionReminderDto } from './dto/send-submission-reminder.dto';

type CoordinatorRequest = {
  user: { userId: string };
  workspaceId: string;
};

@Controller('coordinator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COORDINATOR')
export class CoordinatorController {
  constructor(
    private readonly coordinatorPagesService: CoordinatorPagesService,
    private readonly coordinatorSubmissionsService: CoordinatorSubmissionsService,
  ) {}

  @Get('dashboard')
  getDashboard(@Req() req: CoordinatorRequest) {
    return this.coordinatorPagesService.getDashboard(
      req.user.userId,
      req.workspaceId,
    );
  }

  @Get('analytics')
  getAnalytics(@Req() req: CoordinatorRequest) {
    return this.coordinatorPagesService.getAnalytics(
      req.workspaceId,
    );
  }

  @Get('users')
  getUsers(@Req() req: CoordinatorRequest) {
    return this.coordinatorPagesService.getUsers(
      req.workspaceId,
    );
  }

  @Get('teams')
  getTeams(@Req() req: CoordinatorRequest) {
    return this.coordinatorPagesService.getTeams(
      req.workspaceId,
    );
  }

  @Get('proposals')
  getProposals() {
    return this.coordinatorPagesService.getProposals();
  }

  @Get('evaluations')
  getEvaluations(@Req() req: CoordinatorRequest) {
    return this.coordinatorPagesService.getEvaluations(
      req.workspaceId,
    );
  }

  @Get('results')
  getResults(@Req() req: CoordinatorRequest) {
    return this.coordinatorPagesService.getResults(
      req.workspaceId,
    );
  }

  @Get('announcements')
  getAnnouncements(@Req() req: CoordinatorRequest) {
    return this.coordinatorPagesService.getAnnouncements(
      req.workspaceId,
    );
  }

  @Get('notifications')
  getNotifications(
    @Req() req: CoordinatorRequest,
    @Query() query: NotificationsQueryDto,
  ) {
    return this.coordinatorPagesService.getNotifications(
      req.user.userId,
      query.page,
      query.limit,
      query.isRead,
    );
  }

  @Get('profile')
  getProfile(@Req() req: CoordinatorRequest) {
    return this.coordinatorPagesService.getProfile(
      req.user.userId,
    );
  }

  @Get('submissions/finalized')
  getFinalizedSubmissions(
    @Req() req: CoordinatorRequest,
    @Query() query: GetFinalizedSubmissionsQueryDto,
  ) {
    return this.coordinatorSubmissionsService.getFinalizedSubmissions(
      req.workspaceId,
      {
        phaseId: query.phaseId,
        templateId: query.templateId,
        supervisorId: query.supervisorId,
        teamId: query.teamId,
        evaluationStatus: query.evaluationStatus,
        evaluatorId: query.evaluatorId,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    );
  }

  @Get('submissions/overview')
  getSubmissionOverview(
    @Req() req: CoordinatorRequest,
    @Query('phaseId') phaseId?: string,
  ) {
    return this.coordinatorSubmissionsService.getSubmissionOverview(
      req.workspaceId,
      phaseId,
    );
  }

  @Post('submissions/remind')
  sendSubmissionReminder(
    @Req() req: CoordinatorRequest,
    @Body() dto: SendSubmissionReminderDto,
  ) {
    return this.coordinatorSubmissionsService.sendSupervisorReminder(
      req.workspaceId,
      req.user.userId,
      dto,
    );
  }
}
