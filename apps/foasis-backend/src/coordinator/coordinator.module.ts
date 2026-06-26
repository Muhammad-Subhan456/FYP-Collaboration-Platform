import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EvaluationsModule } from '../progress/evaluations/evaluations.module';
import { EvaluationResultsModule } from '../progress/evaluation-results/evaluation-results.module';
import { GlobalAnnouncementsModule } from '../progress/global-announcements/global-announcements.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';

import { CoordinatorController } from './coordinator.controller';
import { CoordinatorPagesService } from './coordinator-pages.service';

@Module({
  imports: [
    DashboardModule,
    AuthModule,
    TeamsModule,
    ProposalsModule,
    EvaluationsModule,
    EvaluationResultsModule,
    GlobalAnnouncementsModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [CoordinatorController],
  providers: [CoordinatorPagesService],
  exports: [CoordinatorPagesService],
})
export class CoordinatorModule {}
