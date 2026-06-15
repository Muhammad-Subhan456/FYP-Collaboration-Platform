import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateMeetingDto } from './dto/create-meeting.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class MeetingsService {
  constructor(
  private readonly prisma: PrismaService,

  private readonly activityLogsService:
    ActivityLogsService,
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

        description:
          dto.description,

        type: dto.type as any,

        meetingDate:
          new Date(dto.meetingDate),

        location:
          dto.location,

        meetingLink:
          dto.meetingLink,
      },
    });

  await this.activityLogsService.logActivity(
    supervisorId,
    'Meeting Scheduled',
    meeting.title,
  );

  return meeting;
}

  async getMyMeetings(
    supervisorId: string,
  ) {
    return this.prisma.meeting.findMany({
      where: {
        supervisorId,
      },
      orderBy: {
        meetingDate: 'asc',
      },
    });
  }
}