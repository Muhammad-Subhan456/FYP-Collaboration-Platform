import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { GlobalAnnouncementsController } from './global-announcements.controller';
import { GlobalAnnouncementsService } from './global-announcements.service';

@Module({
  imports: [AuthModule, NotificationsModule, ActivityLogsModule],
  controllers: [GlobalAnnouncementsController],
  providers: [GlobalAnnouncementsService],
})
export class GlobalAnnouncementsModule {}
