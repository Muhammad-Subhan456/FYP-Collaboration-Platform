import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AnnouncementsModule } from './announcements/announcements.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { DeliverablesModule } from './deliverables/deliverables.module';
import { DeliverableTemplatesModule } from './deliverable-templates/deliverable-templates.module';
import { PhasesModule } from './phases/phases.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { TeamIssuesModule } from './team-issues/team-issues.module';
import { GlobalAnnouncementsModule } from './global-announcements/global-announcements.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { EvaluationResultsModule } from './evaluation-results/evaluation-results.module';
import { StatsModule } from './stats/stats.module';
import { EvaluationPanelsModule } from './evaluation-panels/evaluation-panels.module';
import { RemindersModule } from './reminders/reminders.module';
import { ProgressCommonModule } from './common/common.module';
import { WorkStreamModule } from './work-stream/work-stream.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ProgressCommonModule,
    WorkStreamModule,
    PhasesModule,
    DeliverableTemplatesModule,
    AnnouncementsModule,
    DeliverablesModule,
    SubmissionsModule,
    TeamIssuesModule,
    ActivityLogsModule,
    GlobalAnnouncementsModule,
    EvaluationsModule,
    EvaluationResultsModule,
    StatsModule,
    EvaluationPanelsModule,
    RemindersModule,
  ],
})
export class ProgressModule {}
