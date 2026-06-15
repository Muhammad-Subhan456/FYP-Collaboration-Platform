import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateMeetingDto } from './dto/create-meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createMeeting(
    supervisorId: string,
    dto: CreateMeetingDto,
  ) {
    return this.prisma.meeting.create({
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