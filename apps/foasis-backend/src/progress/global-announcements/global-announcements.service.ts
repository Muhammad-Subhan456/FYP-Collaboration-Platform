import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  AnnouncementType,
  GlobalAnnouncementStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ScheduledReminderService } from '../reminders/scheduled-reminder.service';
import { ReminderTypes } from '../reminders/reminder.types';
import {
  buildPaginatedResponse,
  getPaginationParams,
} from '../../common/helpers/pagination';

import { normalizeAudienceRoles } from './announcement-audience';
import { AnnouncementAudienceService } from './announcement-audience.service';
import { GlobalAnnouncementDeliveryService } from './global-announcement-delivery.service';
import { CreateGlobalAnnouncementDto } from './dto/create-global-announcement.dto';

@Injectable()
export class GlobalAnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audienceService: AnnouncementAudienceService,
    private readonly deliveryService: GlobalAnnouncementDeliveryService,
    @Inject(forwardRef(() => ScheduledReminderService))
    private readonly scheduledReminderService: ScheduledReminderService,
  ) {}

  private parsePublishAt(value?: string | null): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid publish date');
    }

    return parsed;
  }

  async createAnnouncement(
    coordinatorId: string,
    dto: CreateGlobalAnnouncementDto,
    workspaceId: string,
  ) {
    const audienceRoles = normalizeAudienceRoles(
      dto.audienceRoles,
    );
    const publishAt = this.parsePublishAt(dto.publishAt);
    const scheduleForLater =
      publishAt && publishAt.getTime() > Date.now() + 30_000;

    const announcement =
      await this.prisma.globalAnnouncement.create({
        data: {
          coordinatorId,
          workspaceId,
          title: dto.title,
          message: dto.message,
          type: dto.type ?? AnnouncementType.GENERAL,
          audienceRoles,
          publishAt: scheduleForLater ? publishAt : null,
          status: scheduleForLater
            ? GlobalAnnouncementStatus.SCHEDULED
            : GlobalAnnouncementStatus.PUBLISHED,
          publishedAt: scheduleForLater ? null : new Date(),
          attachments: dto.attachments?.length
            ? {
                create: dto.attachments.map((attachment) => ({
                  fileUrl: attachment.fileUrl,
                  fileName: attachment.fileName,
                })),
              }
            : undefined,
        },
        include: { attachments: true },
      });

    if (scheduleForLater && publishAt) {
      await this.scheduledReminderService.schedule({
        workspaceId,
        reminderType: ReminderTypes.ANNOUNCEMENT_PUBLISH,
        entityType: 'GLOBAL_ANNOUNCEMENT',
        entityId: announcement.id,
        title: `Publish announcement: ${announcement.title}`,
        message: announcement.message,
        scheduledFor: publishAt,
        channels: ['notification'],
        audienceSpec: { roles: audienceRoles },
        metadata: {
          announcementId: announcement.id,
        },
      });

      return announcement;
    }

    await this.deliveryService.deliver(announcement);
    return announcement;
  }

  async publishScheduledAnnouncement(announcementId: string) {
    const announcement =
      await this.prisma.globalAnnouncement.findFirst({
        where: { id: announcementId },
        include: { attachments: true },
      });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (announcement.status === GlobalAnnouncementStatus.PUBLISHED) {
      return announcement;
    }

    const published =
      await this.deliveryService.markPublished(announcementId);

    await this.deliveryService.deliver(published);
    return published;
  }

  async getAnnouncements(
    workspaceId: string,
    viewerRole?: string,
    options?: {
      coordinatorView?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const isCoordinatorView =
      options?.coordinatorView ||
      viewerRole === 'COORDINATOR';

    const where: {
      workspaceId: string;
      status?: GlobalAnnouncementStatus;
    } = { workspaceId };

    if (!isCoordinatorView) {
      where.status = GlobalAnnouncementStatus.PUBLISHED;
    }

    const audienceWhere = isCoordinatorView
      ? {}
      : this.audienceService.audienceWhereForRole(
          viewerRole ?? 'STUDENT',
        );

    const findArgs = {
      where: {
        ...where,
        ...audienceWhere,
      },
      include: { attachments: true },
      orderBy: [
        { publishedAt: 'desc' as const },
        { createdAt: 'desc' as const },
      ],
    };

    if (options?.page != null || options?.limit != null) {
      const { skip, take, page, limit } = getPaginationParams(
        options.page,
        options.limit,
      );

      const [announcements, total] = await Promise.all([
        this.prisma.globalAnnouncement.findMany({
          ...findArgs,
          skip,
          take,
        }),
        this.prisma.globalAnnouncement.count({
          where: findArgs.where,
        }),
      ]);

      return buildPaginatedResponse(
        announcements,
        total,
        page,
        limit,
      );
    }

    return this.prisma.globalAnnouncement.findMany(findArgs);
  }
}
