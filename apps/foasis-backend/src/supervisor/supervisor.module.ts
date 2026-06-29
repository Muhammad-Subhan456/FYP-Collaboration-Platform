import { Module } from '@nestjs/common';

import { DashboardModule } from '../dashboard/dashboard.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnnouncementsModule } from '../progress/announcements/announcements.module';
import { DeliverablesModule } from '../progress/deliverables/deliverables.module';
import { EvaluationPanelsModule } from '../progress/evaluation-panels/evaluation-panels.module';
import { EvaluationResultsModule } from '../progress/evaluation-results/evaluation-results.module';
import { TeamIssuesModule } from '../progress/team-issues/team-issues.module';
import { SubmissionsModule } from '../progress/submissions/submissions.module';
import { WorkStreamModule } from '../progress/work-stream/work-stream.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';

import { SupervisorController } from './supervisor.controller';
import { SupervisorPagesService } from './supervisor-pages.service';

@Module({
  imports: [
    DashboardModule,
    DeliverablesModule,
    AnnouncementsModule,
    ProposalsModule,
    SubmissionsModule,
    TeamIssuesModule,
    EvaluationPanelsModule,
    EvaluationResultsModule,
    TeamsModule,
    UsersModule,
    NotificationsModule,
    WorkStreamModule,
  ],
  controllers: [SupervisorController],
  providers: [SupervisorPagesService],
  exports: [SupervisorPagesService],
})
export class SupervisorModule {}
