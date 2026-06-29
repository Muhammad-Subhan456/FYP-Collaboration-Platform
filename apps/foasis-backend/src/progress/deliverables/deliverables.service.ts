import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkStreamEntityType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { TeamAccessService } from '../common/team-access.service';
import type { NotificationContext } from '../common/team-access.service';
import { WorkStreamService } from '../work-stream/work-stream.service';

@Injectable()
export class DeliverablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly teamAccessService: TeamAccessService,
    private readonly workStreamService: WorkStreamService,
  ) {}

  private teamVisibilityWhere(teamId: string) {
    return {
      OR: [{ teamId }, { teamId: null }],
    };
  }

  private async notifyTeam(
    teamId: string,
    context: NotificationContext,
  ) {
    await this.teamAccessService.notifyTeamMembers(
      teamId,
      context,
    );
  }

  async createDeliverable(
    supervisorId: string,
    dto: CreateDeliverableDto,
  ) {
    const teamIds =
      await this.workStreamService.resolveTeamIdsForSupervisor(
        supervisorId,
        dto.teamIds,
      );

    if (teamIds.length === 0) {
      throw new BadRequestException(
        'At least one team must be selected',
      );
    }

    const created: Awaited<
      ReturnType<typeof this.prisma.deliverable.create>
    >[] = [];

    for (const teamId of teamIds) {
      const deliverable =
        await this.prisma.deliverable.create({
          data: {
            supervisorId,
            teamId,
            title: dto.title,
            description: dto.description,
            type: dto.type,
            dueDate: new Date(dto.dueDate),
            attachmentUrl: dto.attachmentUrl,
          },
        });

      await this.workStreamService.saveAttachments(
        WorkStreamEntityType.DELIVERABLE,
        deliverable.id,
        teamId,
        dto.attachments,
      );

      await this.notifyTeam(teamId, {
        title: 'New Deliverable Assigned',
        message: `${deliverable.title} is due on ${deliverable.dueDate.toDateString()}.`,
        type: 'DELIVERABLE_CREATED',
        entityType: 'DELIVERABLE',
        entityId: deliverable.id,
        route: '/student/work-stream',
      });

      created.push(deliverable);
    }

    await this.activityLogsService.logActivity(
      supervisorId,
      'Deliverable Created',
      dto.title,
    );

    return created.length === 1 ? created[0] : created;
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

    const team =
      await this.teamAccessService.getMyTeam(authorization);

    return this.getDeliverablesForSupervisor(
      supervisorId,
      team?.id ?? null,
    );
  }

  async getForMyTeamByUserId(
    authUserId: string,
    supervisorId?: string | null,
    teamId?: string | null,
  ) {
    const resolvedSupervisorId =
      supervisorId !== undefined
        ? supervisorId
        : (
            await this.teamAccessService.getMyProposalByUserId(
              authUserId,
            )
          )?.assignedSupervisorId ?? null;

    const resolvedTeamId =
      teamId !== undefined
        ? teamId
        : (
            await this.teamAccessService.getMyTeamByUserId(
              authUserId,
            )
          )?.id ?? null;

    return this.getDeliverablesForSupervisor(
      resolvedSupervisorId,
      resolvedTeamId,
    );
  }

  getDeliverablesForSupervisor(
    supervisorId: string | null,
    teamId: string | null = null,
  ) {
    if (!supervisorId) {
      return [];
    }

    return this.prisma.deliverable.findMany({
      where: {
        supervisorId,
        isActive: true,
        ...(teamId
          ? this.teamVisibilityWhere(teamId)
          : {}),
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
      throw new NotFoundException('Deliverable not found');
    }

    if (deliverable.supervisorId !== supervisorId) {
      throw new ForbiddenException(
        'You can only update your own deliverables',
      );
    }

    const updated = await this.prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        ...(dto.isActive !== undefined && {
          isActive: dto.isActive,
        }),
        ...(dto.submissionsOpen !== undefined && {
          submissionsOpen: dto.submissionsOpen,
        }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.dueDate !== undefined && {
          dueDate: new Date(dto.dueDate),
        }),
      },
    });

    if (dto.attachments !== undefined) {
      await this.workStreamService.replaceAttachments(
        WorkStreamEntityType.DELIVERABLE,
        deliverableId,
        deliverable.teamId ?? supervisorId,
        dto.attachments,
      );
    }

    return updated;
  }

  async deleteDeliverable(
    deliverableId: string,
    supervisorId: string,
  ) {
    const deliverable =
      await this.prisma.deliverable.findUnique({
        where: { id: deliverableId },
      });

    if (!deliverable) {
      throw new NotFoundException('Deliverable not found');
    }

    if (deliverable.supervisorId !== supervisorId) {
      throw new ForbiddenException(
        'You can only delete your own deliverables',
      );
    }

    const submissionCount =
      await this.prisma.submission.count({
        where: { deliverableId },
      });

    if (submissionCount > 0) {
      await this.prisma.deliverable.update({
        where: { id: deliverableId },
        data: { isActive: false, submissionsOpen: false },
      });
      return { softDeleted: true };
    }

    await this.prisma.$transaction([
      this.prisma.workStreamComment.deleteMany({
        where: {
          entityType: WorkStreamEntityType.DELIVERABLE,
          entityId: deliverableId,
        },
      }),
      this.prisma.workStreamAttachment.deleteMany({
        where: {
          entityType: WorkStreamEntityType.DELIVERABLE,
          entityId: deliverableId,
        },
      }),
      this.prisma.deliverable.delete({
        where: { id: deliverableId },
      }),
    ]);

    return { success: true };
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

    if (deliverable.teamId) {
      await this.notifyTeam(deliverable.teamId, {
        title: 'Deliverable Deadline Extended',
        message: `The deadline for "${deliverable.title}" has been extended to ${dateLabel(newDueDate)}.`,
        type: 'DELIVERABLE_DEADLINE_EXTENDED',
        entityType: 'DELIVERABLE',
        entityId: deliverable.id,
        route: '/student/work-stream',
      });
    }

    return { deliverable: updated, extension };
  }
}
