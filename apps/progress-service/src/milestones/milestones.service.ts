import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneStatusDto } from './dto/update-milestone-status.dto';
import { ProposalAccessService } from '../common/proposal-access.service';

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proposalAccessService: ProposalAccessService,
  ) {}

  async createMilestone(
    supervisorId: string,
    authorization: string,
    dto: CreateMilestoneDto,
  ) {
    await this.proposalAccessService.assertSupervisorOwnsProposal(
      dto.proposalId,
      supervisorId,
      authorization,
    );

    return this.prisma.milestone.create({
      data: {
        proposalId: dto.proposalId,
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
      },
    });
  }

  async getMilestones(
    proposalId: string,
    authorization: string,
  ) {
    await this.proposalAccessService.getProposal(
      proposalId,
      authorization,
    );

    return this.prisma.milestone.findMany({
      where: { proposalId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async updateMilestoneStatus(
    milestoneId: string,
    supervisorId: string,
    authorization: string,
    dto: UpdateMilestoneStatusDto,
  ) {
    const milestone =
      await this.prisma.milestone.findUnique({
        where: { id: milestoneId },
      });

    if (!milestone) {
      throw new BadRequestException(
        'Milestone not found',
      );
    }

    await this.proposalAccessService.assertSupervisorOwnsProposal(
      milestone.proposalId,
      supervisorId,
      authorization,
    );

    return this.prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: dto.status as any },
    });
  }
}
