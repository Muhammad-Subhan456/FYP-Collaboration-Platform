import { Module } from '@nestjs/common';

import { AppUrlsService } from '../common/app-urls.service';
import { AuthModule } from '../auth/auth.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityLogsModule } from '../progress/activity-logs/activity-logs.module';
import { EvaluationsModule } from '../progress/evaluations/evaluations.module';
import { EvaluationResultsModule } from '../progress/evaluation-results/evaluation-results.module';
import { GlobalAnnouncementsModule } from '../progress/global-announcements/global-announcements.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { InvitationsModule } from '../invitations/invitations.module';

import { CoordinatorController } from './coordinator.controller';
import { CoordinatorPagesService } from './coordinator-pages.service';
import { CoordinatorSubmissionsService } from './coordinator-submissions.service';
import { CoordinatorUsersController } from './coordinator-users.controller';

@Module({
  imports: [
    DashboardModule,
    AuthModule,
    InvitationsModule,
    TeamsModule,
    ProposalsModule,
    EvaluationsModule,
    EvaluationResultsModule,
    GlobalAnnouncementsModule,
    NotificationsModule,
    UsersModule,
    EmailModule,
    ActivityLogsModule,
    WorkspaceModule,
  ],
  controllers: [CoordinatorController, CoordinatorUsersController],
  providers: [
    CoordinatorPagesService,
    CoordinatorSubmissionsService,
    AppUrlsService,
  ],
  exports: [CoordinatorPagesService, CoordinatorSubmissionsService],
})
export class CoordinatorModule {}
