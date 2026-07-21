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

import { runWithWorkspaceContext } from '../../workspace/workspace-als';
import { gaTrace } from '../../common/trace/ga-trace';

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
    return runWithWorkspaceContext(
      announcement.workspaceId,
      async () => this.deliverWithinContext(announcement),
    );
  }

  private async deliverWithinContext(
    announcement: AnnouncementWithAttachments,
  ) {
    this.logger.log(
      `Delivering announcement ${announcement.id} "${announcement.title}" to roles [${announcement.audienceRoles.join(', ')}]`,
    );

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

    this.logger.log(
      `Announcement ${announcement.id}: ${recipients.length} recipients resolved`,
    );

    const notificationTitle = 'FOASIS Program Announcement';
    const notificationMessage = `${announcement.title}: ${announcement.message}`;

    const pendingNotifications = recipients.map((recipient) => ({
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
        announcement.workspaceId,
      );
      this.logger.log(
        `Announcement ${announcement.id}: ${pendingNotifications.length} notifications dispatched`,
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

    gaTrace('2-before-socket-emit', {
      eventName: DomainEvents.GLOBAL_ANNOUNCEMENT_PUBLISHED,
      workspaceId: announcement.workspaceId,
      targetRoom: `workspace:${announcement.workspaceId}`,
      announcementId: announcement.id,
    });

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

    this.logger.log(
      `Announcement ${announcement.id}: GLOBAL_ANNOUNCEMENT_PUBLISHED event emitted to workspace ${announcement.workspaceId}`,
    );
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
