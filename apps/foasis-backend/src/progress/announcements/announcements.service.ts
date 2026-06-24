import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { TeamAccessService } from '../common/team-access.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamAccessService: TeamAccessService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  private parseOptionalDate(
    value?: string,
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(
      value.includes('T')
        ? value
        : `${value}T00:00:00.000Z`,
    );

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        'Invalid due date format',
      );
    }

    return parsed;
  }

  async createAnnouncement(
    supervisorId: string,
    dto: CreateAnnouncementDto,
  ) {
    const dueDate = this.parseOptionalDate(
      dto.dueDate,
    );

    const announcement =
      await this.prisma.announcement.create({
        data: {
          supervisorId,
          title: dto.title,
          message: dto.message,
          type: (dto.type as any) ?? 'GENERAL',
          ...(dueDate && { dueDate }),
        },
      });

    await this.activityLogsService.logActivity(
      supervisorId,
      'Announcement Published',
      announcement.title,
    );

    await this.teamAccessService.notifySupervisedTeamMembers(
      supervisorId,
      {
        title: 'FOASIS Team Announcement',
        message: `${announcement.title}: ${announcement.message}`,
        type: 'ANNOUNCEMENT_PUBLISHED',
        entityType: 'ANNOUNCEMENT',
        entityId: announcement.id,
        route: '/student/announcements',
      },
    );

    return announcement;
  }

  async getMyAnnouncements(supervisorId: string) {
    return this.prisma.announcement.findMany({
      where: { supervisorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getForMyTeam(authorization: string) {
    const supervisorId =
      await this.teamAccessService.getAssignedSupervisorId(
        authorization,
      );

    if (!supervisorId) {
      return [];
    }

    return this.prisma.announcement.findMany({
      where: { supervisorId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
