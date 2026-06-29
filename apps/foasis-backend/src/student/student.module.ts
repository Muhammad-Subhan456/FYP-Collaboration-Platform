import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnnouncementsModule } from '../progress/announcements/announcements.module';
import { DeliverablesModule } from '../progress/deliverables/deliverables.module';
import { EvaluationResultsModule } from '../progress/evaluation-results/evaluation-results.module';
import { EvaluationsModule } from '../progress/evaluations/evaluations.module';
import { MilestonesModule } from '../progress/milestones/milestones.module';
import { SubmissionsModule } from '../progress/submissions/submissions.module';
import { TasksModule } from '../progress/tasks/tasks.module';
import { WorkStreamModule } from '../progress/work-stream/work-stream.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';

import { StudentController } from './student.controller';
import { StudentPagesService } from './student-pages.service';
import { StudentContextModule } from './student-context.module';

@Module({
  imports: [
    StudentContextModule,
    AuthModule,
    DashboardModule,
    TeamsModule,
    UsersModule,
    ProposalsModule,
    DeliverablesModule,
    SubmissionsModule,
    AnnouncementsModule,
    MilestonesModule,
    TasksModule,
    EvaluationsModule,
    EvaluationResultsModule,
    NotificationsModule,
    WorkStreamModule,
  ],
  controllers: [StudentController],
  providers: [StudentPagesService],
})
export class StudentModule {}
