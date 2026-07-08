import { Injectable, Logger } from '@nestjs/common';

import {
  buildNotification,
  NotificationPayload,
} from '../common/helpers/notification-payload';
import { DomainEvents } from '../domain-events/domain-event.constants';
import { DomainEventService } from '../domain-events/domain-event.service';
import type { NotificationCreatedPayload } from '../domain-events/domain-event.types';

import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(
    NotificationDispatchService.name,
  );

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly domainEventService: DomainEventService,
  ) {}

  async send(payload: NotificationPayload): Promise<void> {
    try {
      const notification =
        await this.notificationsService.createOrGroup(
          buildNotification(payload),
        );

      this.publishNotificationCreated(notification);
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

    await Promise.all(
      notifications.map((payload) => this.send(payload)),
    );
  }

  private publishNotificationCreated(notification: {
    id: string;
    authUserId: string;
    title: string;
    message: string;
    type: string | null;
    entityType: string | null;
    entityId: string | null;
    route: string | null;
    isRead: boolean;
    createdAt: Date;
  }) {
    this.domainEventService.emitSafe<NotificationCreatedPayload>({
      name: DomainEvents.NOTIFICATION_CREATED,
      timestamp: notification.createdAt.toISOString(),
      scope: { type: 'user', id: notification.authUserId },
      entity:
        notification.entityType && notification.entityId
          ? {
              type: notification.entityType,
              id: notification.entityId,
            }
          : undefined,
      payload: {
        notification: {
          id: notification.id,
          authUserId: notification.authUserId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          entityType: notification.entityType,
          entityId: notification.entityId,
          route: notification.route,
          isRead: notification.isRead,
          createdAt: notification.createdAt.toISOString(),
        },
      },
    });
  }
}
