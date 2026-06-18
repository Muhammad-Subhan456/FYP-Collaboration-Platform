import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GlobalAnnouncementsController } from './global-announcements.controller';
import { GlobalAnnouncementsService } from './global-announcements.service';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [HttpModule, ActivityLogsModule],
  controllers: [GlobalAnnouncementsController],
  providers: [GlobalAnnouncementsService],
})
export class GlobalAnnouncementsModule {}
