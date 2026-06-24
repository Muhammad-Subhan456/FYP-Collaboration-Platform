import { Injectable, Logger } from '@nestjs/common';

import { AuthService } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

import { CreateGlobalAnnouncementDto } from './dto/create-global-announcement.dto';

@Injectable()
export class GlobalAnnouncementsService {
  private readonly logger = new Logger(
    GlobalAnnouncementsService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  private async notifyAllUsers(
    title: string,
    message: string,
    announcementId: string,
  ) {
    try {
      const recipients =
        await this.authService.listActiveUserIds();

      if (recipients.length === 0) {
        this.logger.warn(
          'Global announcement: no active users found to notify',
        );
        return;
      }

      const routeForRole = (role: string) => {
        switch (role) {
          case 'COORDINATOR':
            return '/coordinator/dashboard';
          case 'SUPERVISOR':
            return '/supervisor/dashboard';
          default:
            return '/student/announcements';
        }
      };

      const notifications = recipients.map((user) => ({
        authUserId: user.id,
        title,
        message,
        type: 'GLOBAL_ANNOUNCEMENT',
        entityType: 'ANNOUNCEMENT',
        entityId: announcementId,
        route: routeForRole(user.role),
      }));

      await this.notificationDispatch.sendBulk(
        notifications,
      );

      await Promise.allSettled(
        recipients.map((user) =>
          this.activityLogsService.logActivity(
            user.id,
            title,
            message,
          ),
        ),
      );
    } catch (error: any) {
      this.logger.error(
        'Failed to deliver global announcement notifications',
        error?.message ?? error,
      );
    }
  }

  async createAnnouncement(
    coordinatorId: string,
    dto: CreateGlobalAnnouncementDto,
  ) {
    const announcement =
      await this.prisma.globalAnnouncement.create({
        data: {
          coordinatorId,
          title: dto.title,
          message: dto.message,
        },
      });

    const notificationTitle = 'FOASIS Program Announcement';
    const notificationMessage = `${dto.title}: ${dto.message}`;

    await this.notifyAllUsers(
      notificationTitle,
      notificationMessage,
      announcement.id,
    );

    return announcement;
  }

  async getAnnouncements() {
    return this.prisma.globalAnnouncement.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
