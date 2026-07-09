import { Injectable, Logger } from '@nestjs/common';
import { GlobalAnnouncementStatus } from '@prisma/client';

import { DomainEvents } from '../../domain-events/domain-event.constants';
import { DomainEventService } from '../../domain-events/domain-event.service';
import type { GlobalAnnouncementPublishedPayload } from '../../domain-events/domain-event.types';
import { EmailService } from '../../email/email.service';
import { buildAnnouncementEmail } from '../../email/email.templates';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

import { AnnouncementAudienceService } from './announcement-audience.service';

type AnnouncementWithAttachments = {
  id: string;
  workspaceId: string;
  title: string;
  message: string;
  audienceRoles: string[];
  attachments: Array<{
    id: string;
    fileUrl: string;
    fileName: string;
  }>;
};

@Injectable()
export class GlobalAnnouncementDeliveryService {
  private readonly logger = new Logger(
    GlobalAnnouncementDeliveryService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly audienceService: AnnouncementAudienceService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly domainEventService: DomainEventService,
    private readonly emailService: EmailService,
  ) {}

  async deliver(announcement: AnnouncementWithAttachments) {
    const recipients =
      await this.audienceService.resolveRecipients(
        announcement.workspaceId,
        announcement.audienceRoles,
      );

    if (recipients.length === 0) {
      this.logger.warn(
        `No recipients for announcement ${announcement.id}`,
      );
      return;
    }

    const notificationTitle = 'FOASIS Program Announcement';
    const notificationMessage = `${announcement.title}: ${announcement.message}`;

    const existingByUser = new Set(
      (
        await this.prisma.notification.findMany({
          where: {
            workspaceId: announcement.workspaceId,
            type: 'GLOBAL_ANNOUNCEMENT',
            entityType: 'GLOBAL_ANNOUNCEMENT',
            entityId: announcement.id,
            authUserId: {
              in: recipients.map((recipient) => recipient.id),
            },
          },
          select: { authUserId: true },
        })
      ).map((row) => row.authUserId),
    );

    const pendingNotifications = recipients
      .filter((recipient) => !existingByUser.has(recipient.id))
      .map((recipient) => ({
        authUserId: recipient.id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'GLOBAL_ANNOUNCEMENT',
        entityType: 'GLOBAL_ANNOUNCEMENT',
        entityId: announcement.id,
        route: recipient.route,
      }));

    if (pendingNotifications.length > 0) {
      await this.notificationDispatch.sendBulk(
        pendingNotifications,
      );
    }

    await Promise.allSettled(
      recipients.map((recipient) =>
        this.activityLogsService.logActivity(
          recipient.id,
          notificationTitle,
          notificationMessage,
        ),
      ),
    );

    await Promise.allSettled(
      recipients
        .filter((recipient) => recipient.email)
        .map((recipient) =>
          this.emailService.send(
            buildAnnouncementEmail({
              to: recipient.email,
              title: announcement.title,
              message: announcement.message,
              actionUrl: recipient.route,
            }),
          ),
        ),
    );

    this.domainEventService.emitSafe<GlobalAnnouncementPublishedPayload>({
      name: DomainEvents.GLOBAL_ANNOUNCEMENT_PUBLISHED,
      timestamp: new Date().toISOString(),
      scope: {
        type: 'workspace',
        id: announcement.workspaceId,
      },
      entity: {
        type: 'GLOBAL_ANNOUNCEMENT',
        id: announcement.id,
      },
      payload: {
        announcement: {
          id: announcement.id,
          workspaceId: announcement.workspaceId,
          title: announcement.title,
          message: announcement.message,
          audienceRoles: announcement.audienceRoles,
          attachmentCount: announcement.attachments.length,
          publishedAt: new Date().toISOString(),
        },
      },
    });
  }

  async markPublished(announcementId: string) {
    return this.prisma.globalAnnouncement.update({
      where: { id: announcementId },
      data: {
        status: GlobalAnnouncementStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: { attachments: true },
    });
  }
}
