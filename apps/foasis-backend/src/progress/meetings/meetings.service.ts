import { Injectable, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { TeamAccessService } from '../common/team-access.service';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly teamAccessService: TeamAccessService,
  ) {}

  async createMeeting(
    supervisorId: string,
    dto: CreateMeetingDto,
  ) {
    const meeting =
      await this.prisma.meeting.create({
        data: {
          supervisorId,
          title: dto.title,
          description: dto.description,
          type: dto.type as any,
          meetingDate: new Date(dto.meetingDate),
          location: dto.location,
          meetingLink: dto.meetingLink,
        },
      });

    await this.activityLogsService.logActivity(
      supervisorId,
      'Meeting Scheduled',
      meeting.title,
    );

    await this.teamAccessService.notifySupervisedTeamMembers(
      supervisorId,
      {
        title: 'FOASIS Meeting Scheduled',
        message: `${meeting.title} on ${meeting.meetingDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}`,
        type: 'MEETING_CREATED',
        entityType: 'MEETING',
        entityId: meeting.id,
        route: '/student/meetings',
      },
    );

    return meeting;
  }

  async getMyMeetings(supervisorId: string) {
    return this.prisma.meeting.findMany({
      where: { supervisorId },
      orderBy: { meetingDate: 'asc' },
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

    return this.prisma.meeting.findMany({
      where: { supervisorId },
      orderBy: { meetingDate: 'asc' },
    });
  }
}
