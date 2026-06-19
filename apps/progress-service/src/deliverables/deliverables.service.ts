import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { TeamAccessService } from '../common/team-access.service';
import type { NotificationContext } from '../common/team-access.service';

@Injectable()
export class DeliverablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly teamAccessService: TeamAccessService,
  ) {}

  private async notifySupervisedTeams(
    supervisorId: string,
    context: NotificationContext,
  ) {
    await this.teamAccessService.notifySupervisedTeamMembers(
      supervisorId,
      context,
    );
  }

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
          attachmentUrl: dto.attachmentUrl,
        },
      });

    await this.activityLogsService.logActivity(
      supervisorId,
      'Deliverable Created',
      deliverable.title,
    );

    await this.notifySupervisedTeams(
      supervisorId,
      {
        title: 'New Deliverable Assigned',
        message: `${deliverable.title} is due on ${deliverable.dueDate.toDateString()}.`,
        type: 'DELIVERABLE_CREATED',
        entityType: 'DELIVERABLE',
        entityId: deliverable.id,
        route: '/student/submissions',
      },
    );

    return deliverable;
  }

  async getMyDeliverables(supervisorId: string) {
    return this.prisma.deliverable.findMany({
      where: { supervisorId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getForMyTeam(authorization: string) {
    const supervisorId =
      await this.teamAccessService.getAssignedSupervisorId(
        authorization,
      );

    if (!supervisorId) {
      return [];
    }

    return this.prisma.deliverable.findMany({
      where: {
        supervisorId,
        isActive: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async updateDeliverable(
    deliverableId: string,
    supervisorId: string,
    dto: UpdateDeliverableDto,
  ) {
    const deliverable =
      await this.prisma.deliverable.findUnique({
        where: { id: deliverableId },
      });

    if (!deliverable) {
      throw new BadRequestException(
        'Deliverable not found',
      );
    }

    if (deliverable.supervisorId !== supervisorId) {
      throw new ForbiddenException(
        'You can only update your own deliverables',
      );
    }

    return this.prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        ...(dto.isActive !== undefined && {
          isActive: dto.isActive,
        }),
      },
    });
  }

  async extendDeadline(
    deliverableId: string,
    supervisorId: string,
    dto: ExtendDeadlineDto,
  ) {
    const deliverable =
      await this.prisma.deliverable.findUnique({
        where: { id: deliverableId },
      });

    if (!deliverable) {
      throw new BadRequestException(
        'Deliverable not found',
      );
    }

    if (deliverable.supervisorId !== supervisorId) {
      throw new ForbiddenException(
        'You can only extend deadlines for your own deliverables',
      );
    }

    const newDueDate = new Date(dto.newDueDate);
    const previousDueDate = deliverable.dueDate;

    if (newDueDate <= previousDueDate) {
      throw new BadRequestException(
        'New deadline must be after the current deadline',
      );
    }

    const [updated, extension] =
      await this.prisma.$transaction([
        this.prisma.deliverable.update({
          where: { id: deliverableId },
          data: { dueDate: newDueDate },
        }),
        this.prisma.deliverableDeadlineExtension.create({
          data: {
            deliverableId,
            previousDueDate,
            newDueDate,
            extendedBy: supervisorId,
            reason: dto.reason,
          },
        }),
      ]);

    const dateLabel = (d: Date) =>
      d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

    await this.activityLogsService.logActivity(
      supervisorId,
      'Deliverable Deadline Extended',
      `${deliverable.title}: ${dateLabel(previousDueDate)} → ${dateLabel(newDueDate)}`,
    );

    await this.notifySupervisedTeams(
      supervisorId,
      {
        title: 'Deliverable Deadline Extended',
        message: `The deadline for "${deliverable.title}" has been extended to ${dateLabel(newDueDate)}.`,
        type: 'DELIVERABLE_DEADLINE_EXTENDED',
        entityType: 'DELIVERABLE',
        entityId: deliverable.id,
        route: '/student/submissions',
      },
    );

    return { deliverable: updated, extension };
  }
}
