import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsQueryDto } from '../notifications/dto/notifications-query.dto';

import { EvaluatorPagesService } from './evaluator-pages.service';

@Controller('evaluator')
@UseGuards(JwtAuthGuard)
export class EvaluatorController {
  constructor(
    private readonly evaluatorPagesService: EvaluatorPagesService,
  ) {}

  @Get('dashboard')
  getDashboard(@Req() req: { user: { userId: string } }) {
    return this.evaluatorPagesService.getDashboard(
      req.user.userId,
    );
  }

  @Get('evaluations')
  getEvaluations(@Req() req: { user: { userId: string } }) {
    return this.evaluatorPagesService.getEvaluations(
      req.user.userId,
    );
  }

  @Get('results')
  getResults(@Req() req: { user: { userId: string } }) {
    return this.evaluatorPagesService.getResults(
      req.user.userId,
    );
  }

  @Get('notifications')
  getNotifications(
    @Req() req: { user: { userId: string } },
    @Query() query: NotificationsQueryDto,
  ) {
    return this.evaluatorPagesService.getNotifications(
      req.user.userId,
      query.page,
      query.limit,
      query.isRead,
    );
  }

  @Get('profile')
  getProfile(@Req() req: { user: { userId: string } }) {
    return this.evaluatorPagesService.getProfile(
      req.user.userId,
    );
  }
}
