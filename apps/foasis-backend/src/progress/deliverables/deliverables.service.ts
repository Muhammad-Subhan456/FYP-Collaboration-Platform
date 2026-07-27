import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WorkStreamEntityType } from '@prisma/client';
import type { Deliverable } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { AppUrlsService } from '../../common/app-urls.service';
import { EmailService } from '../../email/email.service';
import { buildDeliverablePublishedEmail } from '../../email/email.templates';

import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { DomainEvents } from '../../domain-events/domain-event.constants';
import { DomainEventService } from '../../domain-events/domain-event.service';
import type { DeliverableDeletedPayload, DeliverableSnapshotPayload } from '../../domain-events/domain-event.types';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { DeliverableTemplatesService } from '../deliverable-templates/deliverable-templates.service';
import type { PublishDeliverableTemplateDto } from '../deliverable-templates/dto/publish-deliverable-template.dto';
import { TeamAccessService } from '../common/team-access.service';
import type { NotificationContext } from '../common/team-access.service';
import { WorkStreamService } from '../work-stream/work-stream.service';
import { serializeDeliverable } from '../work-stream/work-stream-realtime';

@Injectable()
export class DeliverablesService {
  private readonly logger = new Logger(DeliverablesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly teamAccessService: TeamAccessService,
    private readonly workStreamService: WorkStreamService,
    private readonly domainEventService: DomainEventService,
    private readonly templatesService: DeliverableTemplatesService,
    private readonly emailService: EmailService,
    private readonly appUrls: AppUrlsService,
  ) {}

  private async resolveDefaultPhaseId(workspaceId: string) {
    const phase = await this.prisma.phase.findFirst({
      where: { workspaceId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    if (!phase) {
      throw new BadRequestException(
        'No academic phase exists in this workspace. Create a phase first.',
      );
    }

    return phase.id;
  }

  private publishDeliverableEvent(
    eventName: string,
    actorId: string,
    teamId: string,
    deliverable: Deliverable,
    extras?: Parameters<typeof serializeDeliverable>[1],
  ) {
    this.domainEventService.emitSafe<DeliverableSnapshotPayload>({
      name: eventName,
      timestamp: new Date().toISOString(),
      actorId,
      scope: { type: 'team', id: teamId },
      entity: { type: 'DELIVERABLE', id: deliverable.id },
      payload: {
        teamId,
        deliverable: serializeDeliverable(deliverable, extras),
      },
    });
  }

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

  private async emailTeamStudentsDeliverablePublished(
    teamId: string,
    deliverable: Pick<Deliverable, 'id' | 'title' | 'dueDate'>,
  ) {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      select: { authUserId: true },
    });

    if (members.length === 0) {
      return;
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: members.map((member) => member.authUserId) },
      },
      select: { id: true, email: true },
    });

    const actionUrl = this.appUrls.portalUrl(
      '/student/work-stream?tab=deliverables',
    );

    await Promise.allSettled(
      users
        .filter((user) => Boolean(user.email))
        .map((user) =>
          this.emailService.send(
            buildDeliverablePublishedEmail({
              to: user.email,
              deliverableTitle: deliverable.title,
              dueDate: deliverable.dueDate,
              actionUrl,
            }),
          ),
        ),
    );
  }

  private queueDeliverablePublishedEmail(
    teamId: string,
    deliverable: Pick<Deliverable, 'id' | 'title' | 'dueDate'>,
  ) {
    void this.emailTeamStudentsDeliverablePublished(
      teamId,
      deliverable,
    ).catch((error) => {
      this.logger.warn(
        `Failed to send deliverable-published email for ${deliverable.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
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
      const team = await this.prisma.team.findFirst({
        where: { id: teamId },
        select: { workspaceId: true },
      });
      if (!team) {
        throw new BadRequestException('Team not found');
      }

      const deliverable =
        await this.prisma.deliverable.create({
          data: {
            workspaceId: team.workspaceId,
            supervisorId,
            teamId,
            phaseId: await this.resolveDefaultPhaseId(team.workspaceId),
            title: dto.title,
            description: dto.description,
            type: dto.type,
            dueDate: new Date(dto.dueDate),
            attachmentUrl: dto.attachmentUrl,
            publishedAt: new Date(),
          },
        });

      await this.workStreamService.saveAttachments(
        WorkStreamEntityType.DELIVERABLE,
        deliverable.id,
        teamId,
        dto.attachments,
      );

      void this.notifyTeam(teamId, {
        title: 'New Deliverable Assigned',
        message: `${deliverable.title} is due on ${deliverable.dueDate.toDateString()}.`,
        type: 'DELIVERABLE_CREATED',
        entityType: 'DELIVERABLE',
        entityId: deliverable.id,
        route: '/student/work-stream',
      }).catch(() => undefined);

      this.queueDeliverablePublishedEmail(teamId, deliverable);

      this.publishDeliverableEvent(
        DomainEvents.DELIVERABLE_CREATED,
        supervisorId,
        teamId,
        deliverable,
        { attachmentCount: dto.attachments?.length ?? 0 },
      );

      created.push(deliverable);
    }

    await this.activityLogsService.logActivity(
      supervisorId,
      'Deliverable Created',
      dto.title,
    );

    return created.length === 1 ? created[0] : created;
  }

  async getMyDeliverables(supervisorId: string, phaseId?: string) {
    return this.prisma.deliverable.findMany({
      where: {
        supervisorId,
        ...(phaseId ? { phaseId } : {}),
      },
      include: { phase: true, template: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getForMyTeam(authorization: string, phaseId?: string) {
    const supervisorId =
      await this.teamAccessService.getAssignedSupervisorId(
        authorization,
      );

    const team =
      await this.teamAccessService.getMyTeam(authorization);

    return this.getDeliverablesForSupervisor(
      supervisorId,
      team?.id ?? null,
      phaseId,
    );
  }

  async getForMyTeamByUserId(
    authUserId: string,
    supervisorId?: string | null,
    teamId?: string | null,
    phaseId?: string,
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
      phaseId,
    );
  }

  getDeliverablesForSupervisor(
    supervisorId: string | null,
    teamId: string | null = null,
    phaseId?: string,
  ) {
    if (!supervisorId) {
      return [];
    }

    return this.prisma.deliverable.findMany({
      where: {
        supervisorId,
        isActive: true,
        ...(phaseId ? { phaseId } : {}),
        ...(teamId
          ? this.teamVisibilityWhere(teamId)
          : {}),
      },
      include: { phase: true, template: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Dashboard preview: soonest upcoming (due >= now), then most recent overdue.
   * Caps at `limit` so the overview does not load the full list.
   */
  async getUpcomingForTeamDashboard(
    supervisorId: string | null,
    teamId: string | null,
    limit = 3,
  ) {
    if (!supervisorId || !teamId || limit < 1) {
      return [];
    }

    const now = new Date();
    const baseWhere = {
      supervisorId,
      isActive: true,
      ...this.teamVisibilityWhere(teamId),
    };
    const include = { phase: true, template: true } as const;

    const upcoming = await this.prisma.deliverable.findMany({
      where: {
        ...baseWhere,
        dueDate: { gte: now },
      },
      include,
      orderBy: { dueDate: 'asc' },
      take: limit,
    });

    if (upcoming.length >= limit) {
      return upcoming;
    }

    const overdue = await this.prisma.deliverable.findMany({
      where: {
        ...baseWhere,
        dueDate: { lt: now },
        id: { notIn: upcoming.map((item) => item.id) },
      },
      include,
      orderBy: { dueDate: 'desc' },
      take: limit - upcoming.length,
    });

    return [...upcoming, ...overdue];
  }

  /** Supervisor dashboard: most recently created active deliverables. */
  async getRecentForSupervisorDashboard(
    supervisorId: string,
    limit = 3,
  ) {
    return this.prisma.deliverable.findMany({
      where: {
        supervisorId,
        isActive: true,
      },
      include: { phase: true, template: true },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, limit),
    });
  }

  async publishFromTemplate(
    supervisorId: string,
    dto: PublishDeliverableTemplateDto,
  ) {
    const template = await this.templatesService.getTemplate(
      dto.templateId,
    );

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

    const dueDateByTeam = new Map(
      (dto.teamDueDates ?? []).map((entry) => [
        entry.teamId,
        new Date(entry.dueDate),
      ]),
    );

    const defaultDueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : template.dueDate;

    if (!defaultDueDate && dueDateByTeam.size === 0) {
      throw new BadRequestException(
        'A due date is required when publishing this template',
      );
    }

    const created: Deliverable[] = [];

    for (const teamId of teamIds) {
      const existing = await this.prisma.deliverable.findFirst({
        where: { templateId: template.id, teamId },
      });

      if (existing) {
        throw new BadRequestException(
          `Template already published to team ${teamId}`,
        );
      }

      const team = await this.prisma.team.findFirst({
        where: { id: teamId },
        select: { workspaceId: true },
      });

      if (!team || team.workspaceId !== template.workspaceId) {
        throw new BadRequestException('Team not found in workspace');
      }

      const dueDate =
        dueDateByTeam.get(teamId) ?? defaultDueDate;

      if (!dueDate || Number.isNaN(dueDate.getTime())) {
        throw new BadRequestException(
          `Due date is required for team ${teamId}`,
        );
      }

      const deliverable = await this.prisma.deliverable.create({
        data: {
          workspaceId: team.workspaceId,
          supervisorId,
          teamId,
          phaseId: template.phaseId,
          templateId: template.id,
          title: template.title,
          description: template.description,
          type: template.type,
          dueDate,
          totalMarks: template.totalMarks,
          publishedAt: new Date(),
        },
      });

      if (template.attachments.length > 0) {
        await this.prisma.workStreamAttachment.createMany({
          data: template.attachments.map((attachment) => ({
            id: randomUUID(),
            workspaceId: team.workspaceId,
            entityType: WorkStreamEntityType.DELIVERABLE,
            entityId: deliverable.id,
            teamId,
            fileUrl: attachment.fileUrl,
            fileName: attachment.fileName,
          })),
        });
      }

      void this.notifyTeam(teamId, {
        title: 'New Deliverable Assigned',
        message: `${deliverable.title} is due on ${deliverable.dueDate.toDateString()}.`,
        type: 'DELIVERABLE_CREATED',
        entityType: 'DELIVERABLE',
        entityId: deliverable.id,
        route: '/student/work-stream',
      }).catch(() => undefined);

      this.queueDeliverablePublishedEmail(teamId, deliverable);

      this.publishDeliverableEvent(
        DomainEvents.DELIVERABLE_CREATED,
        supervisorId,
        teamId,
        deliverable,
        { attachmentCount: template.attachments.length },
      );

      created.push(deliverable);
    }

    await this.templatesService.lockTemplate(template.id);

    await this.activityLogsService.logActivity(
      supervisorId,
      'Deliverable Published',
      template.title,
    );

    return created.length === 1 ? created[0] : created;
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

    const teamId = updated.teamId ?? supervisorId;

    const latestSubmission =
      await this.prisma.submission.findFirst({
        where: { deliverableId },
        orderBy: { version: 'desc' },
        select: { status: true },
      });

    const now = new Date();
    const submissionOpen =
      updated.isActive &&
      updated.submissionsOpen &&
      now <= updated.dueDate &&
      latestSubmission?.status !== 'APPROVED' &&
      latestSubmission?.status !== 'FINALIZED';

    const submissionClosedReason = submissionOpen
      ? null
      : !updated.isActive
        ? 'INACTIVE'
        : !updated.submissionsOpen
          ? 'CLOSED'
          : now > updated.dueDate
            ? 'PAST_DUE'
            : latestSubmission?.status === 'APPROVED' ||
                latestSubmission?.status === 'FINALIZED'
              ? latestSubmission.status
              : 'CLOSED';

    this.publishDeliverableEvent(
      DomainEvents.DELIVERABLE_UPDATED,
      supervisorId,
      teamId,
      updated,
      {
        attachmentCount: dto.attachments?.length,
        submissionOpen,
        submissionClosedReason,
      },
    );

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

    const teamId = deliverable.teamId ?? supervisorId;
    const submissionCount =
      await this.prisma.submission.count({
        where: { deliverableId },
      });

    if (submissionCount > 0) {
      const softDeleted = await this.prisma.deliverable.update({
        where: { id: deliverableId },
        data: { isActive: false, submissionsOpen: false },
      });

      this.publishDeliverableEvent(
        DomainEvents.DELIVERABLE_UPDATED,
        supervisorId,
        teamId,
        softDeleted,
      );

      return { softDeleted: true, deliverable: softDeleted };
    }

    this.domainEventService.emitSafe<DeliverableDeletedPayload>({
      name: DomainEvents.DELIVERABLE_DELETED,
      timestamp: new Date().toISOString(),
      actorId: supervisorId,
      scope: { type: 'team', id: teamId },
      entity: { type: 'DELIVERABLE', id: deliverableId },
      payload: {
        teamId,
        deliverableId,
      },
    });

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
      void this.notifyTeam(deliverable.teamId, {
        title: 'Deliverable Deadline Extended',
        message: `The deadline for "${deliverable.title}" has been extended to ${dateLabel(newDueDate)}.`,
        type: 'DELIVERABLE_DEADLINE_EXTENDED',
        entityType: 'DELIVERABLE',
        entityId: deliverable.id,
        route: '/student/work-stream',
      }).catch(() => undefined);
    }

    this.publishDeliverableEvent(
      DomainEvents.DELIVERABLE_DEADLINE_EXTENDED,
      supervisorId,
      deliverable.teamId ?? supervisorId,
      updated,
    );

    return { deliverable: updated, extension };
  }
}
