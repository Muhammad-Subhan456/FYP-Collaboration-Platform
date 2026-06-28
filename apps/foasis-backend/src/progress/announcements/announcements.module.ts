import { Module } from '@nestjs/common';

import { ProgressCommonModule } from '../common/common.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { WorkStreamModule } from '../work-stream/work-stream.module';

import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  imports: [ProgressCommonModule, ActivityLogsModule, WorkStreamModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
