import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class DeliverablesService {
  constructor(
  private readonly prisma: PrismaService,

  private readonly activityLogsService:
    ActivityLogsService,
) {}
  async createDeliverable(
  supervisorId: string,
  dto: CreateDeliverableDto,
) {
  const deliverable =
    await this.prisma.deliverable.create({
      data: {
        supervisorId,

        title: dto.title,

        description: dto.description,

        type: dto.type,

        dueDate: new Date(dto.dueDate),

        attachmentUrl:
          dto.attachmentUrl,
      },
    });

  await this.activityLogsService.logActivity(
    supervisorId,
    'Deliverable Created',
    deliverable.title,
  );

  return deliverable;
}

  async getMyDeliverables(
    supervisorId: string,
  ) {
    return this.prisma.deliverable.findMany({
      where: {
        supervisorId,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }
}