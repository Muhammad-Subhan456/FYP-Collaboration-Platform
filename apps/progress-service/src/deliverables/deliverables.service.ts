import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateDeliverableDto } from './dto/create-deliverable.dto';

@Injectable()
export class DeliverablesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createDeliverable(
    supervisorId: string,
    dto: CreateDeliverableDto,
  ) {
    return this.prisma.deliverable.create({
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