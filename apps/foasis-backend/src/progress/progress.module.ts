import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AnnouncementsModule } from './announcements/announcements.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { DeliverablesModule } from './deliverables/deliverables.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { MeetingsModule } from './meetings/meetings.module';
import { MilestonesModule } from './milestones/milestones.module';
import { TasksModule } from './tasks/tasks.module';
import { GlobalAnnouncementsModule } from './global-announcements/global-announcements.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { EvaluationResultsModule } from './evaluation-results/evaluation-results.module';
import { StatsModule } from './stats/stats.module';
import { EvaluationPanelsModule } from './evaluation-panels/evaluation-panels.module';
import { RemindersModule } from './reminders/reminders.module';
import { ProgressCommonModule } from './common/common.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ProgressCommonModule,
    AnnouncementsModule,
    DeliverablesModule,
    SubmissionsModule,
    MeetingsModule,
    MilestonesModule,
    TasksModule,
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
