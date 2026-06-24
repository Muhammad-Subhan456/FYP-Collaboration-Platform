import { Module } from '@nestjs/common';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationDispatchService],
  exports: [NotificationsService, NotificationDispatchService],
})
export class NotificationsModule {}
