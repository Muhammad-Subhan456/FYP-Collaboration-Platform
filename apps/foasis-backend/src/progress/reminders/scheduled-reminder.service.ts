import {
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import {
  Prisma,
  ReminderStatus,
} from '@prisma/client';

import { EmailService } from '../../email/email.service';
import { buildAnnouncementEmail } from '../../email/email.templates';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { runWithWorkspaceContext } from '../../workspace/workspace-als';
import { AnnouncementAudienceService } from '../global-announcements/announcement-audience.service';
import { GlobalAnnouncementsService } from '../global-announcements/global-announcements.service';

import {
  ReminderTypes,
  type ReminderAudienceSpec,
  type ScheduleReminderInput,
} from './reminder.types';

@Injectable()
export class ScheduledReminderService {
  private readonly logger = new Logger(
    ScheduledReminderService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly emailService: EmailService,
    private readonly audienceService: AnnouncementAudienceService,
    @Inject(forwardRef(() => GlobalAnnouncementsService))
    private readonly globalAnnouncementsService: GlobalAnnouncementsService,
  ) {}

  async schedule(input: ScheduleReminderInput) {
    return this.prisma.scheduledReminder.create({
      data: {
        workspaceId: input.workspaceId,
        reminderType: input.reminderType,
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title,
        message: input.message,
        route: input.route,
        channels: input.channels ?? ['notification'],
        audienceSpec: input.audienceSpec as Prisma.InputJsonValue,
        scheduledFor: input.scheduledFor,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async cancelByEntity(
    reminderType: string,
    entityType: string,
    entityId: string,
  ) {
    await this.prisma.scheduledReminder.updateMany({
      where: {
        reminderType,
        entityType,
        entityId,
        status: ReminderStatus.PENDING,
      },
      data: {
        status: ReminderStatus.CANCELLED,
      },
    });
  }

  async processDueReminders(limit = 50) {
    const due = await this.prisma.scheduledReminder.findMany({
      where: {
        status: ReminderStatus.PENDING,
        scheduledFor: { lte: new Date() },
      },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
    });

    for (const reminder of due) {
      await this.processReminder(reminder.id);
    }

    return due.length;
  }

  private async processReminder(reminderId: string) {
    const claimed = await this.prisma.scheduledReminder.updateMany({
      where: {
        id: reminderId,
        status: ReminderStatus.PENDING,
      },
      data: {
        status: ReminderStatus.PROCESSING,
      },
    });

    if (claimed.count === 0) {
      return;
    }

    const reminder =
      await this.prisma.scheduledReminder.findFirst({
        where: { id: reminderId },
      });

    if (!reminder) {
      return;
    }

    try {
      await runWithWorkspaceContext(
        reminder.workspaceId,
        async () => {
          switch (reminder.reminderType) {
            case ReminderTypes.ANNOUNCEMENT_PUBLISH:
              if (!reminder.entityId) {
                throw new Error(
                  'Announcement publish reminder missing entityId',
                );
              }
              await this.globalAnnouncementsService.publishScheduledAnnouncement(
                reminder.entityId,
              );
              break;
            default:
              await this.dispatchGenericReminder(reminder);
              break;
          }
        },
      );

      await this.prisma.scheduledReminder.update({
        where: { id: reminder.id },
        data: {
          status: ReminderStatus.SENT,
          sentAt: new Date(),
          lastError: null,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Reminder processing failed';

      this.logger.error(
        `Reminder ${reminder.id} failed: ${message}`,
      );

      await this.prisma.scheduledReminder.update({
        where: { id: reminder.id },
        data: {
          status: ReminderStatus.FAILED,
          lastError: message,
        },
      });
    }
  }

  private async dispatchGenericReminder(reminder: {
    workspaceId: string;
    title: string;
    message: string;
    route: string | null;
    channels: string[];
    audienceSpec: unknown;
    metadata: unknown;
  }) {
    const audience =
      (reminder.audienceSpec as ReminderAudienceSpec | null) ??
      {};
    const recipients =
      await this.audienceService.resolveRecipients(
        reminder.workspaceId,
        audience.roles ?? [],
      );

    const userIds = audience.userIds?.length
      ? recipients.filter((recipient) =>
          audience.userIds?.includes(recipient.id),
        )
      : recipients;

    const metadata = reminder.metadata as
      | { type?: string; entityType?: string; entityId?: string }
      | null;

    const sendEmail = reminder.channels.includes('email');
    const sendNotification =
      reminder.channels.includes('notification');

    for (const recipient of userIds) {
      if (sendNotification) {
        await this.notificationDispatch.send({
          authUserId: recipient.id,
          title: reminder.title,
          message: reminder.message,
          type: metadata?.type ?? reminder.title,
          entityType: metadata?.entityType,
          entityId: metadata?.entityId,
          route: reminder.route ?? recipient.route,
        });
      }

      if (sendEmail && recipient.email) {
        await this.emailService.send(
          buildAnnouncementEmail({
            to: recipient.email,
            title: reminder.title,
            message: reminder.message,
            actionUrl: reminder.route ?? recipient.route,
          }),
        );
      }
    }
  }
}
