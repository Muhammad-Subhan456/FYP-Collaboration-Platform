import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateActivityLogDto } from './dto/create-activity-log.dto';

@Injectable()
export class ActivityLogsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createLog(
    dto: CreateActivityLogDto,
  ) {
    return this.prisma.activityLog.create({
      data: {
        authUserId: dto.authUserId,

        title: dto.title,

        description: dto.description,
      },
    });
  }

  async getMyLogs(
    authUserId: string,
  ) {
    return this.prisma.activityLog.findMany({
      where: {
        authUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }
}