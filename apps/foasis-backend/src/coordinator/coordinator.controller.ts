import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsQueryDto } from '../notifications/dto/notifications-query.dto';

import { CoordinatorPagesService } from './coordinator-pages.service';

@Controller('coordinator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COORDINATOR')
export class CoordinatorController {
  constructor(
    private readonly coordinatorPagesService: CoordinatorPagesService,
  ) {}

  @Get('dashboard')
  getDashboard(@Req() req: { user: { userId: string } }) {
    return this.coordinatorPagesService.getDashboard(
      req.user.userId,
    );
  }

  @Get('analytics')
  getAnalytics() {
    return this.coordinatorPagesService.getAnalytics();
  }

  @Get('users')
  getUsers() {
    return this.coordinatorPagesService.getUsers();
  }

  @Get('teams')
  getTeams() {
    return this.coordinatorPagesService.getTeams();
  }

  @Get('proposals')
  getProposals() {
    return this.coordinatorPagesService.getProposals();
  }

  @Get('evaluations')
  getEvaluations() {
    return this.coordinatorPagesService.getEvaluations();
  }

  @Get('results')
  getResults() {
    return this.coordinatorPagesService.getResults();
  }

  @Get('announcements')
  getAnnouncements() {
    return this.coordinatorPagesService.getAnnouncements();
  }

  @Get('notifications')
  getNotifications(
    @Req() req: { user: { userId: string } },
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
  getProfile(@Req() req: { user: { userId: string } }) {
    return this.coordinatorPagesService.getProfile(
      req.user.userId,
    );
  }

  @Get('system-health')
  getSystemHealth() {
    return this.coordinatorPagesService.getSystemHealth();
  }
}
