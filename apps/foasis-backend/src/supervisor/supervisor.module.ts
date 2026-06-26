import { Module } from '@nestjs/common';

import { DashboardModule } from '../dashboard/dashboard.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnnouncementsModule } from '../progress/announcements/announcements.module';
import { DeliverablesModule } from '../progress/deliverables/deliverables.module';
import { EvaluationPanelsModule } from '../progress/evaluation-panels/evaluation-panels.module';
import { EvaluationResultsModule } from '../progress/evaluation-results/evaluation-results.module';
import { MeetingsModule } from '../progress/meetings/meetings.module';
import { MilestonesModule } from '../progress/milestones/milestones.module';
import { SubmissionsModule } from '../progress/submissions/submissions.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';

import { SupervisorController } from './supervisor.controller';
import { SupervisorPagesService } from './supervisor-pages.service';

@Module({
  imports: [
    DashboardModule,
    DeliverablesModule,
    MeetingsModule,
    AnnouncementsModule,
    ProposalsModule,
    SubmissionsModule,
    MilestonesModule,
    EvaluationPanelsModule,
    EvaluationResultsModule,
    TeamsModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [SupervisorController],
  providers: [SupervisorPagesService],
  exports: [SupervisorPagesService],
})
export class SupervisorModule {}
