import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';
import { DeliverablesModule } from '../progress/deliverables/deliverables.module';
import { EvaluationsModule } from '../progress/evaluations/evaluations.module';
import { SubmissionEvaluationsModule } from '../progress/submission-evaluations/submission-evaluations.module';
import { StatsModule } from '../progress/stats/stats.module';
import { AnnouncementsModule } from '../progress/announcements/announcements.module';
import { GlobalAnnouncementsModule } from '../progress/global-announcements/global-announcements.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityLogsModule } from '../progress/activity-logs/activity-logs.module';
import { StudentContextModule } from '../student/student-context.module';

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
    SubmissionEvaluationsModule,
    AnnouncementsModule,
    GlobalAnnouncementsModule,
    NotificationsModule,
    ActivityLogsModule,
    StudentContextModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
