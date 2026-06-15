import { Module } from '@nestjs/common';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}