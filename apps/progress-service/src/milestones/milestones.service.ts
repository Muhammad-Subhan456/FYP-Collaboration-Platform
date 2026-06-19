import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneStatusDto } from './dto/update-milestone-status.dto';
import { ProposalAccessService } from '../common/proposal-access.service';
import { TeamAccessService } from '../common/team-access.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proposalAccessService: ProposalAccessService,
    private readonly teamAccessService: TeamAccessService,
    private readonly activityLogsService: ActivityLogsService,
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

    const proposal = await this.proposalAccessService.getProposal(
      dto.proposalId,
      authorization,
    );

    const milestone = await this.prisma.milestone.create({
      data: {
        proposalId: dto.proposalId,
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
      },
    });

    await this.activityLogsService.logActivity(
      supervisorId,
      'Milestone Created',
      milestone.title,
    );

    await this.teamAccessService.notifyTeamMembers(
      proposal.teamId,
      {
        title: 'FOASIS Milestone Added',
        message: `New milestone "${milestone.title}" is due on ${milestone.dueDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}.`,
        type: 'MILESTONE_CREATED',
        entityType: 'MILESTONE',
        entityId: milestone.id,
        route: '/student/milestones',
      },
    );

    return milestone;
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

    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: dto.status as any },
    });

    const proposal = await this.proposalAccessService.getProposal(
      milestone.proposalId,
      authorization,
    );

    await this.teamAccessService.notifyTeamMembers(
      proposal.teamId,
      {
        title: 'FOASIS Milestone Updated',
        message: `Milestone "${updated.title}" is now ${dto.status.replace(/_/g, ' ').toLowerCase()}.`,
        type: 'MILESTONE_UPDATED',
        entityType: 'MILESTONE',
        entityId: updated.id,
        route: '/student/milestones',
      },
    );

    return updated;
  }
}
