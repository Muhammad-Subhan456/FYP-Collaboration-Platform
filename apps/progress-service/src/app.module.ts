import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

import { AnnouncementsModule } from './announcements/announcements.module';
import { DeliverablesModule } from './deliverables/deliverables.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { MeetingsModule } from './meetings/meetings.module';
import { MilestonesModule } from './milestones/milestones.module';
import { TasksModule } from './tasks/tasks.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { GlobalAnnouncementsModule } from './global-announcements/global-announcements.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { EvaluationResultsModule } from './evaluation-results/evaluation-results.module';
import { StatsModule } from './stats/stats.module';
import { HealthModule } from './health/health.module';
import { EvaluationPanelsModule } from './evaluation-panels/evaluation-panels.module';
import { RemindersModule } from './reminders/reminders.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
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
    HealthModule,
    EvaluationPanelsModule,
    RemindersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}