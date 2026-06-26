import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StudentContextService } from '../../student/student-context.service';

import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly studentContextService: StudentContextService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('coordinator')
  getCoordinatorStats() {
    return this.statsService.getCoordinatorStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get('supervisor')
  getSupervisorStats(@Req() req: any) {
    return this.statsService.getSupervisorStats(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('student')
  async getStudentStats(@Req() req: any) {
    const { teamId, supervisorId } =
      await this.studentContextService.load(
        req.user.userId,
      );

    if (!teamId) {
      return {
        pendingSubmissions: 0,
        upcomingDeliverables: 0,
        openTasks: 0,
        upcomingEvaluations: 0,
      };
    }

    return this.statsService.getStudentStats(
      teamId,
      req.user.userId,
      supervisorId,
    );
  }
}
