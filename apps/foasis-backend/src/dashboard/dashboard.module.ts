import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';
import { DeliverablesModule } from '../progress/deliverables/deliverables.module';
import { EvaluationsModule } from '../progress/evaluations/evaluations.module';
import { StatsModule } from '../progress/stats/stats.module';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    UsersModule,
    TeamsModule,
    ProposalsModule,
    AuthModule,
    StatsModule,
    DeliverablesModule,
    EvaluationsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
