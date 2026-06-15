import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateGlobalAnnouncementDto } from './dto/create-global-announcement.dto';

@Injectable()
export class GlobalAnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createAnnouncement(
    coordinatorId: string,
    dto: CreateGlobalAnnouncementDto,
  ) {
    return this.prisma.globalAnnouncement.create({
      data: {
        coordinatorId,
        title: dto.title,
        message: dto.message,
      },
    });
  }

  async getAnnouncements() {
    return this.prisma.globalAnnouncement.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}