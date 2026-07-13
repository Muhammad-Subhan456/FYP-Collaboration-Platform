import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { getWorkspaceIdFromContext } from '../workspace/workspace-als';

import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  buildPaginatedResponse,
  getPaginationParams,
} from '../common/helpers/pagination';

const GROUPABLE_NOTIFICATION_TYPES = new Set([
  'TEAM_ISSUE_COMMENTED',
  'WORKSTREAM_COMMENTED',
  'RESULT_PUBLISHED',
  'RESULT_UPDATED',
  'EVALUATION_SUBMITTED',
]);

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private requireWorkspaceId(): string {
    const workspaceId = getWorkspaceIdFromContext();
    if (!workspaceId) {
      throw new ForbiddenException('Workspace context is required');
    }
    return workspaceId;
  }

  create(
    createNotificationDto: CreateNotificationDto,
  ) {
    return this.prisma.notification.create({
      data: {
        ...createNotificationDto,
        workspaceId: this.requireWorkspaceId(),
      },
    });
  }

  async createOrGroup(
    createNotificationDto: CreateNotificationDto,
  ) {
    const { type, entityType, entityId, authUserId } =
      createNotificationDto;

    if (
      !type ||
      !entityType ||
      !entityId ||
      !GROUPABLE_NOTIFICATION_TYPES.has(type)
    ) {
      return this.create(createNotificationDto);
    }

    const existing =
      await this.prisma.notification.findFirst({
        where: {
          authUserId,
          type,
          entityType,
          entityId,
          isRead: false,
        },
        orderBy: { createdAt: 'desc' },
      });

    if (!existing) {
      return this.create(createNotificationDto);
    }

    return this.prisma.notification.update({
      where: { id: existing.id },
      data: {
        title: createNotificationDto.title ?? existing.title,
        message: this.buildGroupedMessage(
          type,
          existing.message,
          createNotificationDto.message,
        ),
        route: createNotificationDto.route ?? existing.route,
        createdAt: new Date(),
      },
    });
  }

  private buildGroupedMessage(
    type: string,
    existingMessage: string,
    latestMessage: string,
  ) {
    if (
      type === 'RESULT_PUBLISHED' ||
      type === 'RESULT_UPDATED' ||
      type === 'EVALUATION_SUBMITTED'
    ) {
      const groupedMatch = existingMessage.match(
        /^(\d+) evaluation updates\./,
      );

      if (groupedMatch) {
        const count = Number(groupedMatch[1]) + 1;
        return `${count} evaluation updates. Latest: ${this.latestSnippet(latestMessage)}`;
      }

      return `2 evaluation updates. Latest: ${this.latestSnippet(latestMessage)}`;
    }

    const groupedMatch = existingMessage.match(
      /^(\d+) new comments on this thread\./,
    );

    if (groupedMatch) {
      const count = Number(groupedMatch[1]) + 1;
      return `${count} new comments on this thread. Latest: ${this.latestSnippet(latestMessage)}`;
    }

    return `2 new comments on this thread. Latest: ${this.latestSnippet(latestMessage)}`;
  }

  private latestSnippet(message: string) {
    const trimmed = message.trim();
    if (trimmed.length <= 120) {
      return trimmed;
    }

    return `${trimmed.slice(0, 117)}...`;
  }

  createBulk(
    notifications: CreateNotificationDto[],
  ) {
    const workspaceId = this.requireWorkspaceId();
    return this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        ...n,
        workspaceId,
      })),
    });
  }

  async getMyNotifications(
    authUserId: string,
    page = 1,
    limit = 20,
    isRead?: boolean,
  ) {
    const pagination = getPaginationParams(
      page,
      limit,
    );

    const where = {
      authUserId,
      ...(isRead === undefined ? {} : { isRead }),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),

      this.prisma.notification.count({
        where,
      }),
    ]);

    return buildPaginatedResponse(
      data,
      total,
      pagination.page,
      pagination.limit,
    );
  }

  getUnreadCount(authUserId: string) {
    return this.prisma.notification.count({
      where: {
        authUserId,
        isRead: false,
      },
    });
  }

  markAllAsRead(authUserId: string) {
    return this.prisma.notification.updateMany({
      where: {
        authUserId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAsRead(
    notificationId: string,
    authUserId: string,
  ) {
    const notification =
      await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

    if (!notification) {
      throw new BadRequestException(
        'Notification not found',
      );
    }

    if (notification.authUserId !== authUserId) {
      throw new ForbiddenException(
        'You can only mark your own notifications as read',
      );
    }

    return this.prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
      },
    });
  }
}
