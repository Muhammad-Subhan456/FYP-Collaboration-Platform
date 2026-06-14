import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateNotificationDto } from './dto/create-notification.dto';

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

  getMyNotifications(
    authUserId: string,
  ) {
    return this.prisma.notification.findMany({
      where: {
        authUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  markAsRead(
    notificationId: string,
  ) {
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