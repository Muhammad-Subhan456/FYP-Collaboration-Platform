import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateMilestoneDto } from './dto/create-milestone.dto';

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createMilestone(
    dto: CreateMilestoneDto,
  ) {
    return this.prisma.milestone.create({
      data: {
        proposalId:
          dto.proposalId,

        title:
          dto.title,

        description:
          dto.description,

        dueDate:
          new Date(dto.dueDate),
      },
    });
  }

  async getMilestones(
    proposalId: string,
  ) {
    return this.prisma.milestone.findMany({
      where: {
        proposalId,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }
}