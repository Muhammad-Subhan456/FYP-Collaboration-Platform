import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  buildPaginatedResponse,
  getPaginationParams,
} from '../common/pagination';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  create(
    createNotificationDto: CreateNotificationDto,
  ) {
    return this.prisma.notification.create({
      data: createNotificationDto,
    });
  }

  createBulk(
    notifications: CreateNotificationDto[],
  ) {
    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  async getMyNotifications(
    authUserId: string,
    page = 1,
    limit = 20,
  ) {
    const pagination = getPaginationParams(
      page,
      limit,
    );

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { authUserId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),

      this.prisma.notification.count({
        where: { authUserId },
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
