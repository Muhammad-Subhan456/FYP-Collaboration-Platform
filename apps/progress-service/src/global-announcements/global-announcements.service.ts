import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

import { CreateGlobalAnnouncementDto } from './dto/create-global-announcement.dto';

@Injectable()
export class GlobalAnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  private internalHeaders() {
    return {
      'X-Internal-Api-Key':
        process.env.INTERNAL_API_KEY,
    };
  }

  private async notifyAllUsers(
    title: string,
    message: string,
    announcementId: string,
  ) {
    const authServiceUrl =
      process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';
    const notificationServiceUrl =
      process.env.NOTIFICATION_SERVICE_URL ??
      'http://localhost:3005';

    try {
      const usersResponse = await firstValueFrom(
        this.httpService.get<
          Array<{ id: string; role: string }>
        >(
          `${authServiceUrl}/auth/internal/active-users`,
          { headers: this.internalHeaders() },
        ),
      );

      const recipients = usersResponse.data ?? [];

      if (recipients.length === 0) {
        console.warn(
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

      await firstValueFrom(
        this.httpService.post(
          `${notificationServiceUrl}/notifications/bulk`,
          { notifications },
          { headers: this.internalHeaders() },
        ),
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
      console.error(
        'Failed to deliver global announcement notifications',
        error?.response?.data ?? error.message,
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
