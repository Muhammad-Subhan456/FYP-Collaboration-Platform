import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnnouncementType,
  GlobalAnnouncementStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginatedResponse,
  getPaginationParams,
} from '../../common/helpers/pagination';

import { normalizeAudienceRoles } from './announcement-audience';
import { AnnouncementAudienceService } from './announcement-audience.service';
import { gaTrace } from '../../common/trace/ga-trace';
import { GlobalAnnouncementDeliveryService } from './global-announcement-delivery.service';
import { parseDisplayPublishAt } from './display-publish-at';
import { CreateGlobalAnnouncementDto } from './dto/create-global-announcement.dto';

@Injectable()
export class GlobalAnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audienceService: AnnouncementAudienceService,
    private readonly deliveryService: GlobalAnnouncementDeliveryService,
  ) {}

  private async attachCoordinatorNames<
    T extends { coordinatorId: string },
  >(announcements: T[]) {
    if (announcements.length === 0) {
      return announcements as (T & { coordinatorName: string | null })[];
    }

    const coordinatorIds = [
      ...new Set(announcements.map((item) => item.coordinatorId)),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: coordinatorIds } },
      select: { id: true, fullName: true },
    });
    const nameById = new Map(
      users.map((user) => [user.id, user.fullName]),
    );

    return announcements.map((item) => ({
      ...item,
      coordinatorName: nameById.get(item.coordinatorId) ?? null,
    }));
  }

  async createAnnouncement(
    coordinatorId: string,
    dto: CreateGlobalAnnouncementDto,
    workspaceId: string,
  ) {
    const audienceUserIds =
      await this.audienceService.validateAudienceUserIds(
        workspaceId,
        dto.audienceUserIds ?? [],
      );

    const hasExplicitRoles = (dto.audienceRoles?.length ?? 0) > 0;
    const audienceRoles = normalizeAudienceRoles(dto.audienceRoles, {
      defaultToAllWhenEmpty: !hasExplicitRoles && audienceUserIds.length === 0,
    });

    if (audienceRoles.length === 0 && audienceUserIds.length === 0) {
      throw new BadRequestException(
        'Select at least one audience role or individual recipient',
      );
    }

    const recipients = await this.audienceService.resolveRecipients(
      workspaceId,
      audienceRoles,
      audienceUserIds,
    );

    if (recipients.length === 0) {
      throw new BadRequestException(
        'No valid recipients for this announcement',
      );
    }

    const displayPublishAt = parseDisplayPublishAt(dto.publishAt);

    const announcement =
      await this.prisma.globalAnnouncement.create({
        data: {
          coordinatorId,
          workspaceId,
          title: dto.title,
          message: dto.message,
          type: dto.type ?? AnnouncementType.GENERAL,
          audienceRoles,
          audienceUserIds,
          publishAt: displayPublishAt ?? null,
          status: GlobalAnnouncementStatus.PUBLISHED,
          publishedAt: new Date(),
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

    gaTrace('1-announcement-saved', {
      announcementId: announcement.id,
      workspaceId: announcement.workspaceId,
      title: announcement.title,
      status: announcement.status,
      displayPublishAt: displayPublishAt?.toISOString() ?? null,
    });

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
      viewerUserId?: string;
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
      : this.audienceService.audienceWhereForViewer(
          viewerRole ?? 'STUDENT',
          options?.viewerUserId,
        );

    const findArgs = {
      where: {
        ...where,
        ...audienceWhere,
      },
      include: { attachments: true },
      orderBy: [
        { publishedAt: 'desc' as const },
        { publishAt: 'desc' as const },
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
        await this.attachCoordinatorNames(announcements),
        total,
        page,
        limit,
      );
    }

    return this.attachCoordinatorNames(
      await this.prisma.globalAnnouncement.findMany(findArgs),
    );
  }
}

