import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createAnnouncement(
    supervisorId: string,
    dto: CreateAnnouncementDto,
  ) {
    return this.prisma.announcement.create({
      data: {
        supervisorId,
        title: dto.title,
        message: dto.message,
      },
    });
  }

  async getMyAnnouncements(
    supervisorId: string,
  ) {
    return this.prisma.announcement.findMany({
      where: {
        supervisorId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}