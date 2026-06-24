import {
  Controller,
  Get,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { StatsService } from './stats.service';
import { TeamAccessService } from '../common/team-access.service';

@Controller('stats')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly teamAccessService: TeamAccessService,
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
  async getStudentStats(
    @Req() req: any,
    @Headers('authorization') authorization: string,
  ) {
    const team =
      await this.teamAccessService.getMyTeam(
        authorization,
      );

    if (!team) {
      return {
        pendingSubmissions: 0,
        upcomingDeliverables: 0,
        openTasks: 0,
        upcomingEvaluations: 0,
      };
    }

    const supervisorId =
      await this.teamAccessService.getAssignedSupervisorId(
        authorization,
      );

    return this.statsService.getStudentStats(
      team.id,
      req.user.userId,
      supervisorId,
    );
  }
}
