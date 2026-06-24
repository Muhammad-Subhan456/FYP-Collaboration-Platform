import { Injectable, Logger } from '@nestjs/common';

import {
  buildNotification,
  NotificationPayload,
} from '../common/helpers/notification-payload';

import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(
    NotificationDispatchService.name,
  );

  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  async send(payload: NotificationPayload): Promise<void> {
    try {
      await this.notificationsService.create(
        buildNotification(payload),
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for ${payload.authUserId}`,
        error,
      );
    }
  }

  async sendBulk(
    notifications: NotificationPayload[],
  ): Promise<void> {
    if (notifications.length === 0) {
      return;
    }

    try {
      await this.notificationsService.createBulk(
        notifications.map((item) =>
          buildNotification(item),
        ),
      );
    } catch (error) {
      this.logger.error(
        'Failed to create bulk notifications',
        error,
      );
    }
  }
}
