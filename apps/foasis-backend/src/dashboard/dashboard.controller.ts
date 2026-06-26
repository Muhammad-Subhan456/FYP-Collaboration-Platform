import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getDashboard(@Req() req: { user: { userId: string } }) {
    return this.dashboardService.getDashboard(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('coordinator')
  getCoordinatorDashboard() {
    return this.dashboardService.getCoordinatorDashboard();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get('supervisor')
  getSupervisorDashboard(
    @Req() req: { user: { userId: string } },
  ) {
    return this.dashboardService.getSupervisorDashboard(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'SUPERVISOR', 'COORDINATOR')
  @Get('overview')
  getOverview(
    @Req() req: { user: { userId: string; role: string } },
  ) {
    return this.dashboardService.getOverview(
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('student')
  getStudentDashboard(
    @Req() req: { user: { userId: string } },
  ) {
    return this.dashboardService.getStudentDashboard(
      req.user.userId,
    );
  }
}
