import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsQueryDto } from '../notifications/dto/notifications-query.dto';

import { SupervisorPagesService } from './supervisor-pages.service';

@Controller('supervisor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR')
export class SupervisorController {
  constructor(
    private readonly supervisorPagesService: SupervisorPagesService,
  ) {}

  @Get('dashboard')
  getDashboard(@Req() req: { user: { userId: string } }) {
    return this.supervisorPagesService.getDashboard(
      req.user.userId,
    );
  }

  @Get('teams')
  getTeams(@Req() req: { user: { userId: string } }) {
    return this.supervisorPagesService.getTeams(
      req.user.userId,
    );
  }

  @Get('work-stream')
  getWorkStream(
    @Req() req: { user: { userId: string } },
    @Query('teamId') teamId?: string,
  ) {
    return this.supervisorPagesService.getWorkStream(
      req.user.userId,
      teamId,
    );
  }

  @Get('deliverables')
  getDeliverables(@Req() req: { user: { userId: string } }) {
    return this.supervisorPagesService.getDeliverables(
      req.user.userId,
    );
  }

  @Get('announcements')
  getAnnouncements(@Req() req: { user: { userId: string } }) {
    return this.supervisorPagesService.getAnnouncements(
      req.user.userId,
    );
  }

  @Get('notifications')
  getNotifications(
    @Req() req: { user: { userId: string } },
    @Query() query: NotificationsQueryDto,
  ) {
    return this.supervisorPagesService.getNotifications(
      req.user.userId,
      query.page,
      query.limit,
      query.isRead,
    );
  }

  @Get('profile')
  getProfile(@Req() req: { user: { userId: string } }) {
    return this.supervisorPagesService.getProfile(
      req.user.userId,
    );
  }

  @Get('requests')
  getRequests(@Req() req: { user: { userId: string } }) {
    return this.supervisorPagesService.getRequests(
      req.user.userId,
    );
  }

  @Get('invitations')
  getInvitations(@Req() req: { user: { userId: string } }) {
    return this.supervisorPagesService.getInvitations(
      req.user.userId,
    );
  }

  @Get('reviews')
  getReviews(
    @Req() req: { user: { userId: string } },
    @Query('deliverableId') deliverableId?: string,
  ) {
    return this.supervisorPagesService.getReviews(
      req.user.userId,
      deliverableId,
    );
  }

  @Get('milestones')
  getMilestones(
    @Req() req: { user: { userId: string } },
    @Query('teamId') teamId?: string,
  ) {
    return this.supervisorPagesService.getMilestones(
      req.user.userId,
      teamId,
    );
  }

  @Get('evaluations')
  getEvaluations(@Req() req: { user: { userId: string } }) {
    return this.supervisorPagesService.getEvaluations(
      req.user.userId,
    );
  }
}
