import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReminderStatus, SubmissionStatus } from '@prisma/client';

import { AppUrlsService } from '../common/app-urls.service';
import { EmailService } from '../email/email.service';
import { buildSubmissionReminderEmail } from '../email/email.templates';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import {
  buildPaginatedResponse,
  getPaginationParams,
} from '../common/helpers/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../progress/activity-logs/activity-logs.service';
import { ReminderTypes } from '../progress/reminders/reminder.types';
import { ProfilesService } from '../users/profiles.service';
import { resolveEvaluationAggregateStatus } from '../progress/submission-evaluations/submission-scoring.util';

import { SendSubmissionReminderDto } from './dto/send-submission-reminder.dto';

type OverviewGroupKey = string;

@Injectable()
export class CoordinatorSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly emailService: EmailService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly appUrls: AppUrlsService,
  ) {}

  private overviewEntityId(templateId: string, supervisorId: string) {
    return `${templateId}:${supervisorId}`;
  }

  private async loadSupervisorSummaries(supervisorIds: string[]) {
    if (!supervisorIds.length) {
      return new Map<
        string,
        { id: string; fullName: string; email: string }
      >();
    }

    const [profiles, users] = await Promise.all([
      this.profilesService.findManyByAuthUserIds(supervisorIds),
      this.prisma.user.findMany({
        where: { id: { in: supervisorIds } },
        select: { id: true, email: true, fullName: true },
      }),
    ]);

    return new Map(
      users.map((user) => [
        user.id,
        {
          id: user.id,
          fullName:
            profiles[user.id]?.fullName ?? user.fullName ?? 'Supervisor',
          email: user.email,
        },
      ]),
    );
  }

  async getFinalizedSubmissions(
    workspaceId: string,
    options?: {
      phaseId?: string;
      templateId?: string;
      supervisorId?: string;
      teamId?: string;
      evaluationStatus?: string;
      evaluatorId?: string;
      page?: number;
      limit?: number;
      sortBy?: 'finalizedAt' | 'deliverable' | 'team' | 'supervisor';
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const pagination = getPaginationParams(
      options?.page,
      options?.limit,
    );

    const where = {
      workspaceId,
      status: SubmissionStatus.FINALIZED,
      ...(options?.teamId ? { teamId: options.teamId } : {}),
      deliverable: {
        ...(options?.phaseId ? { phaseId: options.phaseId } : {}),
        ...(options?.templateId
          ? { templateId: options.templateId }
          : {}),
        ...(options?.supervisorId
          ? { supervisorId: options.supervisorId }
          : {}),
      },
    };

    const orderBy =
      options?.sortBy === 'deliverable'
        ? { deliverable: { title: options?.sortOrder ?? 'asc' } }
        : options?.sortBy === 'finalizedAt'
          ? { finalizedAt: options?.sortOrder ?? 'desc' }
          : { finalizedAt: 'desc' as const };

    const allRows = await this.prisma.submission.findMany({
        where,
        include: {
          deliverable: {
            include: { phase: true, template: true },
          },
          evaluations: {
            select: {
              id: true,
              evaluatorId: true,
              status: true,
            },
          },
          attachments: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              fileUrl: true,
              fileName: true,
            },
          },
        },
        orderBy,
    });

    const teamIds = [...new Set(allRows.map((row) => row.teamId))];
    const supervisorIds = [
      ...new Set(allRows.map((row) => row.deliverable.supervisorId)),
    ];

    const evaluatorIds = [
      ...new Set(
        allRows.flatMap((row) =>
          row.evaluations.map((evaluation) => evaluation.evaluatorId),
        ),
      ),
    ];

    const [teams, supervisors, evaluators] = await Promise.all([
      teamIds.length
        ? this.prisma.team.findMany({
            where: { id: { in: teamIds } },
            select: { id: true, name: true, projectTitle: true },
          })
        : Promise.resolve([]),
      this.loadSupervisorSummaries(supervisorIds),
      evaluatorIds.length
        ? this.loadSupervisorSummaries(evaluatorIds)
        : Promise.resolve(new Map()),
    ]);

    const teamById = new Map<
      string,
      { id: string; name: string }
    >(
      teams.map((team) => [
        team.id,
        {
          id: team.id,
          name: team.name || team.projectTitle || 'Team',
        },
      ] as const),
    );

    let data = allRows.map((row) => {
      const evaluationStatus = resolveEvaluationAggregateStatus(
        row.evaluations,
      );
      const assignedEvaluators = row.evaluations.map((evaluation) => ({
        evaluationId: evaluation.id,
        evaluatorId: evaluation.evaluatorId,
        evaluator:
          evaluators.get(evaluation.evaluatorId) ?? null,
        status: evaluation.status,
      }));

      return {
        id: row.id,
        version: row.version,
        status: row.status,
        fileUrl: row.fileUrl,
        attachments:
          row.attachments.length > 0
            ? row.attachments
            : row.fileUrl
              ? [
                  {
                    id: `${row.id}-primary`,
                    fileUrl: row.fileUrl,
                    fileName: 'Submission file',
                  },
                ]
              : [],
        finalizedAt: row.finalizedAt,
        submittedAt: row.submittedAt,
        deliverable: {
          id: row.deliverable.id,
          title: row.deliverable.title,
          phase: row.deliverable.phase
            ? {
                id: row.deliverable.phase.id,
                name: row.deliverable.phase.name,
              }
            : null,
          template: row.deliverable.template
            ? {
                id: row.deliverable.template.id,
                title: row.deliverable.template.title,
              }
            : null,
        },
        team: teamById.get(row.teamId) ?? {
          id: row.teamId,
          name: 'Unknown team',
        },
        supervisor: supervisors.get(row.deliverable.supervisorId) ?? {
          id: row.deliverable.supervisorId,
          fullName: 'Supervisor',
          email: '',
        },
        evaluationStatus,
        evaluators: assignedEvaluators,
      };
    });

    if (options?.evaluationStatus) {
      data = data.filter(
        (row) => row.evaluationStatus === options.evaluationStatus,
      );
    }

    if (options?.evaluatorId) {
      data = data.filter((row) =>
        row.evaluators.some(
          (item) => item.evaluatorId === options.evaluatorId,
        ),
      );
    }

    if (options?.sortBy === 'supervisor' || options?.sortBy === 'team') {
      const direction = options.sortOrder === 'desc' ? -1 : 1;
      const compareKey =
        options.sortBy === 'supervisor'
          ? (item: (typeof data)[number]) => item.supervisor.fullName
          : (item: (typeof data)[number]) => item.team.name;

      data.sort((left, right) =>
        compareKey(left).localeCompare(compareKey(right), undefined, {
          sensitivity: 'base',
        }) * direction,
      );
    }

    const total = data.length;
    const paginatedData = data.slice(
      pagination.skip,
      pagination.skip + pagination.take,
    );

    return buildPaginatedResponse(
      paginatedData,
      total,
      pagination.page,
      pagination.limit,
    );
  }

  async getSubmissionOverview(
    workspaceId: string,
    phaseId?: string,
  ) {
    const deliverables = await this.prisma.deliverable.findMany({
      where: {
        workspaceId,
        isActive: true,
        teamId: { not: null },
        ...(phaseId ? { phaseId } : {}),
      },
      select: {
        id: true,
        teamId: true,
        supervisorId: true,
        templateId: true,
        title: true,
        phaseId: true,
        phase: { select: { id: true, name: true } },
        template: { select: { id: true, title: true } },
      },
    });

    if (!deliverables.length) {
      return [];
    }

    const deliverableIds = deliverables.map((item) => item.id);
    const finalizedSubmissions =
      await this.prisma.submission.findMany({
        where: {
          workspaceId,
          deliverableId: { in: deliverableIds },
          status: SubmissionStatus.FINALIZED,
        },
        select: { deliverableId: true, teamId: true },
      });

    const finalizedByDeliverableId = new Set(
      finalizedSubmissions.map(
        (item) => `${item.deliverableId}:${item.teamId}`,
      ),
    );

    type GroupAccumulator = {
      templateId: string;
      deliverableTitle: string;
      phaseId: string;
      phaseName: string;
      supervisorId: string;
      assignedTeamIds: Set<string>;
      submittedTeamIds: Set<string>;
      deliverableIds: Set<string>;
    };

    const groups = new Map<OverviewGroupKey, GroupAccumulator>();

    for (const deliverable of deliverables) {
      if (!deliverable.teamId || !deliverable.templateId) {
        continue;
      }

      const key = this.overviewEntityId(
        deliverable.templateId,
        deliverable.supervisorId,
      );

      const existing = groups.get(key) ?? {
        templateId: deliverable.templateId,
        deliverableTitle:
          deliverable.template?.title ?? deliverable.title,
        phaseId: deliverable.phaseId,
        phaseName: deliverable.phase?.name ?? 'Phase',
        supervisorId: deliverable.supervisorId,
        assignedTeamIds: new Set<string>(),
        submittedTeamIds: new Set<string>(),
        deliverableIds: new Set<string>(),
      };

      existing.assignedTeamIds.add(deliverable.teamId);
      existing.deliverableIds.add(deliverable.id);

      if (
        finalizedByDeliverableId.has(
          `${deliverable.id}:${deliverable.teamId}`,
        )
      ) {
        existing.submittedTeamIds.add(deliverable.teamId);
      }

      groups.set(key, existing);
    }

    const supervisorIds = [
      ...new Set(
        [...groups.values()].map((group) => group.supervisorId),
      ),
    ];
    const templateIds = [
      ...new Set([...groups.values()].map((group) => group.templateId)),
    ];

    const [supervisors, reminderRows] = await Promise.all([
      this.loadSupervisorSummaries(supervisorIds),
      templateIds.length
        ? this.prisma.scheduledReminder.findMany({
            where: {
              workspaceId,
              reminderType:
                ReminderTypes.SUPERVISOR_SUBMISSION_PENDING,
              entityId: {
                in: [...groups.keys()],
              },
              status: ReminderStatus.SENT,
            },
            select: {
              entityId: true,
              sentAt: true,
            },
            orderBy: { sentAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const lastReminderByEntityId = new Map<string, Date>();
    for (const reminder of reminderRows) {
      if (
        reminder.entityId &&
        reminder.sentAt &&
        !lastReminderByEntityId.has(reminder.entityId)
      ) {
        lastReminderByEntityId.set(
          reminder.entityId,
          reminder.sentAt,
        );
      }
    }

    return [...groups.values()]
      .map((group) => {
        const assignedTeamCount = group.assignedTeamIds.size;
        const submittedTeamCount = group.submittedTeamIds.size;
        const pendingTeamCount =
          assignedTeamCount - submittedTeamCount;
        const entityId = this.overviewEntityId(
          group.templateId,
          group.supervisorId,
        );

        return {
          templateId: group.templateId,
          deliverableTitle: group.deliverableTitle,
          phaseId: group.phaseId,
          phaseName: group.phaseName,
          supervisorId: group.supervisorId,
          supervisor:
            supervisors.get(group.supervisorId) ?? {
              id: group.supervisorId,
              fullName: 'Supervisor',
              email: '',
            },
          assignedTeamCount,
          submittedTeamCount,
          pendingTeamCount,
          progressLabel: `${submittedTeamCount}/${assignedTeamCount}`,
          deliverableIds: [...group.deliverableIds],
          pendingTeamIds: [...group.assignedTeamIds].filter(
            (teamId) => !group.submittedTeamIds.has(teamId),
          ),
          lastReminderSentAt:
            lastReminderByEntityId.get(entityId)?.toISOString() ??
            null,
        };
      })
      .sort((left, right) => {
        if (right.pendingTeamCount !== left.pendingTeamCount) {
          return right.pendingTeamCount - left.pendingTeamCount;
        }

        return left.deliverableTitle.localeCompare(
          right.deliverableTitle,
        );
      });
  }

  async sendSupervisorReminder(
    workspaceId: string,
    coordinatorId: string,
    dto: SendSubmissionReminderDto,
  ) {
    const overview = (
      await this.getSubmissionOverview(workspaceId)
    ).find(
      (row) =>
        row.templateId === dto.templateId &&
        row.supervisorId === dto.supervisorId,
    );

    if (!overview) {
      throw new NotFoundException(
        'No published deliverables found for this supervisor and template',
      );
    }

    if (overview.pendingTeamCount === 0) {
      throw new BadRequestException(
        'This supervisor has no pending submissions to remind',
      );
    }

    const supervisor = overview.supervisor;
    const actionUrl = `${this.appUrls.frontendBaseUrl}/supervisor/work-stream?tab=deliverables`;
    const title = 'Pending submission reminder';
    const message = `${overview.pendingTeamCount} team(s) still need finalized submissions for ${overview.deliverableTitle}.`;

    await this.notificationDispatch.send({
      authUserId: dto.supervisorId,
      title,
      message,
      type: 'SUBMISSION_REMINDER',
      entityType: 'DELIVERABLE_TEMPLATE',
      entityId: dto.templateId,
      route: '/supervisor/work-stream?tab=deliverables',
    });

    if (supervisor.email) {
      await this.emailService.send(
        buildSubmissionReminderEmail({
          to: supervisor.email,
          deliverableTitle: overview.deliverableTitle,
          phaseName: overview.phaseName,
          pendingCount: overview.pendingTeamCount,
          assignedCount: overview.assignedTeamCount,
          actionUrl,
        }),
      );
    }

    const entityId = this.overviewEntityId(
      dto.templateId,
      dto.supervisorId,
    );

    await this.prisma.scheduledReminder.create({
      data: {
        workspaceId,
        reminderType: ReminderTypes.SUPERVISOR_SUBMISSION_PENDING,
        entityType: 'DELIVERABLE_TEMPLATE_SUPERVISOR',
        entityId,
        title,
        message,
        route: '/supervisor/work-stream?tab=deliverables',
        channels: ['notification', 'email'],
        audienceSpec: {
          roles: ['SUPERVISOR'],
          userIds: [dto.supervisorId],
        },
        scheduledFor: new Date(),
        status: ReminderStatus.SENT,
        sentAt: new Date(),
        metadata: {
          templateId: dto.templateId,
          supervisorId: dto.supervisorId,
          pendingTeamCount: overview.pendingTeamCount,
          sentByCoordinatorId: coordinatorId,
        },
      },
    });

    await this.activityLogsService.logActivity(
      coordinatorId,
      'Submission Reminder Sent',
      `${overview.deliverableTitle} → ${supervisor.fullName}`,
    );

    return {
      success: true,
      lastReminderSentAt: new Date().toISOString(),
    };
  }
}
