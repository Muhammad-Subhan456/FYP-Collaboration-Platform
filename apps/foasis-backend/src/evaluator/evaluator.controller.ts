import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.evaluatorPagesService.getNotifications(
      req.user.userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('profile')
  getProfile(@Req() req: { user: { userId: string } }) {
    return this.evaluatorPagesService.getProfile(
      req.user.userId,
    );
  }
}
