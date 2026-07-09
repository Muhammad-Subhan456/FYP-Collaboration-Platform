import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { DomainEventsModule } from '../../domain-events/domain-events.module';
import { EmailModule } from '../../email/email.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { RemindersModule } from '../reminders/reminders.module';

import { AnnouncementAudienceService } from './announcement-audience.service';
import { GlobalAnnouncementDeliveryService } from './global-announcement-delivery.service';
import { GlobalAnnouncementsController } from './global-announcements.controller';
import { GlobalAnnouncementsService } from './global-announcements.service';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    ActivityLogsModule,
    DomainEventsModule,
    EmailModule,
    forwardRef(() => RemindersModule),
  ],
  controllers: [GlobalAnnouncementsController],
  providers: [
    AnnouncementAudienceService,
    GlobalAnnouncementDeliveryService,
    GlobalAnnouncementsService,
  ],
  exports: [
    AnnouncementAudienceService,
    GlobalAnnouncementsService,
    GlobalAnnouncementDeliveryService,
  ],
})
export class GlobalAnnouncementsModule {}
