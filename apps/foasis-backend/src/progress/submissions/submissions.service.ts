import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';
import { AppUrlsService } from '../../common/app-urls.service';
import { EmailService } from '../../email/email.service';
import { buildSubmissionReceivedEmail } from '../../email/email.templates';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { TeamAccessService } from '../common/team-access.service';
import { DomainEvents } from '../../domain-events/domain-event.constants';
import { DomainEventService } from '../../domain-events/domain-event.service';
import type { SubmissionSnapshotPayload } from '../../domain-events/domain-event.types';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import {
  buildPaginatedResponse,
  getPaginationParams,
} from '../../common/helpers/pagination';
import { serializeSubmission } from '../work-stream/work-stream-realtime';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly teamAccessService: TeamAccessService,
    private readonly domainEventService: DomainEventService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly appUrls: AppUrlsService,
  ) {}

  private async notifySupervisor(
    supervisorId: string,
    context: Omit<
      Parameters<NotificationDispatchService['send']>[0],
      'authUserId'
    >,
  ) {
    await this.notificationDispatch.send({
      authUserId: supervisorId,
      ...context,
    });
  }

  private async notifyTeamMembers(
    teamId: string,
    context: Omit<
      Parameters<NotificationDispatchService['send']>[0],
      'authUserId'
    >,
  ) {
    await this.teamAccessService.notifyTeamMembers(
      teamId,
      context,
    );
  }

  private async emailSupervisorSubmissionReceived(input: {
    supervisorId: string;
    teamId: string;
    deliverableTitle: string;
    phaseId: string | null;
    submittedAt: Date;
  }) {
    const [supervisor, team, phase] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: input.supervisorId },
        select: { email: true },
      }),
      this.prisma.team.findUnique({
        where: { id: input.teamId },
        select: { name: true },
      }),
      input.phaseId
        ? this.prisma.phase.findUnique({
            where: { id: input.phaseId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

    if (!supervisor?.email) {
      this.logger.warn(
        `Supervisor ${input.supervisorId} has no email; skipping submission email`,
      );
      return;
    }

    await this.emailService.send(
      buildSubmissionReceivedEmail({
        to: supervisor.email,
        deliverableTitle: input.deliverableTitle,
        teamName: team?.name ?? 'Team',
        phaseName: phase?.name ?? null,
        submittedAt: input.submittedAt,
        actionUrl: this.appUrls.portalUrl(
          `/supervisor/work-stream?tab=deliverables&teamId=${encodeURIComponent(
            input.teamId,
          )}`,
        ),
      }),
    );
  }

  async createSubmission(
    authUserId: string,
    authorization: string,
    dto: CreateSubmissionDto,
  ) {
    const team =
      await this.teamAccessService.getMyTeam(
        authorization,
      );

    if (!team?.id) {
      throw new ForbiddenException(
        'You are not a member of any team',
      );
    }

    const deliverable =
      await this.prisma.deliverable.findUnique({
        where: {
          id: dto.deliverableId,
        },
      });

    if (!deliverable) {
      throw new BadRequestException(
        'Deliverable not found',
      );
    }

    if (!deliverable.isActive) {
      throw new BadRequestException(
        'Deliverable is no longer active',
      );
    }

    if (!deliverable.submissionsOpen) {
      throw new BadRequestException(
        'Submissions are closed for this deliverable',
      );
    }

    if (
      deliverable.teamId &&
      deliverable.teamId !== team.id
    ) {
      throw new ForbiddenException(
        'This deliverable is not assigned to your team',
      );
    }

    const assignedSupervisorId =
      await this.teamAccessService.getAssignedSupervisorId(
        authorization,
      );

    if (
      !assignedSupervisorId ||
      deliverable.supervisorId !== assignedSupervisorId
    ) {
      throw new ForbiddenException(
        'This deliverable is not assigned to your team supervisor',
      );
    }

    if (new Date() > deliverable.dueDate) {
      throw new BadRequestException(
        'Submission deadline has passed',
      );
    }

    const existingSubmissions =
      await this.prisma.submission.findMany({
        where: {
          deliverableId: dto.deliverableId,
          teamId: team.id,
        },
        orderBy: {
          version: 'desc',
        },
      });

    const latestSubmission =
      existingSubmissions[0];

    if (
      latestSubmission?.status === 'APPROVED' ||
      latestSubmission?.status === 'FINALIZED'
    ) {
      throw new BadRequestException(
        'This deliverable is already approved and cannot be re-submitted',
      );
    }

    const nextVersion =
      existingSubmissions.length > 0
        ? existingSubmissions[0].version + 1
        : 1;

    const attachmentInputs =
      dto.attachments && dto.attachments.length > 0
        ? dto.attachments
        : [
            {
              fileUrl: dto.fileUrl,
              fileName:
                dto.fileUrl.split('/').pop()?.split('?')[0] ||
                'submission-file',
            },
          ];

    const primaryFileUrl = attachmentInputs[0]?.fileUrl ?? dto.fileUrl;

    const submission = await this.prisma.$transaction(async (tx) => {
      const created = await tx.submission.create({
        data: {
          workspaceId: deliverable.workspaceId,
          deliverableId: dto.deliverableId,
          teamId: team.id,
          version: nextVersion,
          fileUrl: primaryFileUrl,
          remarks: dto.remarks,
        },
      });

      await tx.submissionAttachment.createMany({
        data: attachmentInputs.map((attachment) => ({
          workspaceId: deliverable.workspaceId,
          submissionId: created.id,
          fileUrl: attachment.fileUrl,
          fileName: attachment.fileName,
        })),
      });

      return tx.submission.findUniqueOrThrow({
        where: { id: created.id },
        include: { attachments: { orderBy: { createdAt: 'asc' } } },
      });
    });

    await this.activityLogsService.logActivity(
      authUserId,
      'Document Submitted',
      `${deliverable.title} (v${nextVersion})`,
    );

    void this.notifySupervisor(deliverable.supervisorId, {
      title: 'New Submission Received',
      message: `A team submitted ${deliverable.title} (v${nextVersion}).`,
      type: 'NEW_SUBMISSION',
      entityType: 'SUBMISSION',
      entityId: submission.id,
      route: '/supervisor/work-stream',
    }).catch(() => undefined);

    void this.emailSupervisorSubmissionReceived({
      supervisorId: deliverable.supervisorId,
      teamId: team.id,
      deliverableTitle: deliverable.title,
      phaseId: deliverable.phaseId ?? null,
      submittedAt: submission.submittedAt,
    }).catch((error) => {
      this.logger.warn(
        `Failed to send submission-received email for ${submission.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    this.domainEventService.emitSafe<SubmissionSnapshotPayload>({
      name: DomainEvents.SUBMISSION_CREATED,
      timestamp: submission.submittedAt.toISOString(),
      actorId: authUserId,
      scope: { type: 'team', id: team.id },
      entity: { type: 'SUBMISSION', id: submission.id },
      payload: {
        teamId: team.id,
        deliverableId: dto.deliverableId,
        submission: serializeSubmission(submission),
      },
    });

    return submission;
  }

  async getMySubmissions(
    authorization: string,
    page = 1,
    limit = 20,
  ) {
    const team =
      await this.teamAccessService.getMyTeam(
        authorization,
      );

    return this.getMySubmissionsForTeam(
      team,
      page,
      limit,
    );
  }

  async getMySubmissionsByUserId(
    authUserId: string,
    page = 1,
    limit = 20,
    team?: { id: string } | null,
  ) {
    const resolvedTeam =
      team !== undefined
        ? team
        : await this.teamAccessService.getMyTeamByUserId(
            authUserId,
          );

    return this.getMySubmissionsForTeam(
      resolvedTeam,
      page,
      limit,
    );
  }

  private async getMySubmissionsForTeam(
    team: { id: string } | null,
    page = 1,
    limit = 20,
  ) {
    const pagination = getPaginationParams(
      page,
      limit,
    );

    if (!team) {
      return buildPaginatedResponse(
        [],
        0,
        pagination.page,
        pagination.limit,
      );
    }

    const [data, total] = await Promise.all([
      this.prisma.submission.findMany({
        where: { teamId: team.id },
        include: { deliverable: true },
        orderBy: { submittedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),

      this.prisma.submission.count({
        where: { teamId: team.id },
      }),
    ]);

    return buildPaginatedResponse(
      data,
      total,
      pagination.page,
      pagination.limit,
    );
  }

  async getSubmissionHistoriesByTeamId(teamId: string) {
    const submissions =
      await this.prisma.submission.findMany({
        where: { teamId },
        orderBy: [
          { deliverableId: 'asc' },
          { version: 'desc' },
        ],
      });

    return submissions.reduce(
      (acc, submission) => {
        if (!acc[submission.deliverableId]) {
          acc[submission.deliverableId] = [];
        }

        acc[submission.deliverableId].push(submission);
        return acc;
      },
      {} as Record<string, typeof submissions>,
    );
  }

  async getDeliverableSubmissions(
    deliverableId: string,
    supervisorId: string,
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
        'You can only view submissions for your own deliverables',
      );
    }

    return this.prisma.submission.findMany({
      where: { deliverableId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getSubmissionDetail(
    submissionId: string,
    supervisorId: string,
  ) {
    const submission =
      await this.prisma.submission.findUnique({
        where: { id: submissionId },
        include: { deliverable: true },
      });

    if (!submission) {
      throw new BadRequestException(
        'Submission not found',
      );
    }

    if (
      submission.deliverable.supervisorId !==
      supervisorId
    ) {
      throw new ForbiddenException(
        'You can only view submissions for your own deliverables',
      );
    }

    return submission;
  }

  async reviewSubmission(
    submissionId: string,
    supervisorId: string,
    dto: ReviewSubmissionDto,
  ) {
    const submission =
      await this.prisma.submission.findUnique({
        where: { id: submissionId },
        include: { deliverable: true },
      });

    if (!submission) {
      throw new BadRequestException(
        'Submission not found',
      );
    }

    if (
      submission.deliverable.supervisorId !==
      supervisorId
    ) {
      throw new ForbiddenException(
        'You can only review submissions for your own deliverables',
      );
    }

    if (submission.status !== 'SUBMITTED') {
      throw new BadRequestException(
        'Only submitted work can be reviewed',
      );
    }

    const updatedSubmission =
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: dto.status as any,
          feedback: dto.feedback,
          grade: dto.grade,
        },
      });

    await this.activityLogsService.logActivity(
      supervisorId,
      'Submission Reviewed',
      submission.deliverable.title,
    );

    void this.notifyTeamMembers(submission.teamId, {
      title: 'Submission Reviewed',
      message: `Feedback has been provided for ${submission.deliverable.title}.`,
      type: 'SUBMISSION_REVIEWED',
      entityType: 'SUBMISSION',
      entityId: submission.id,
      route: '/student/work-stream',
    }).catch(() => undefined);

    this.domainEventService.emitSafe<SubmissionSnapshotPayload>({
      name: DomainEvents.SUBMISSION_REVIEWED,
      timestamp: new Date().toISOString(),
      actorId: supervisorId,
      scope: { type: 'team', id: submission.teamId },
      entity: { type: 'SUBMISSION', id: updatedSubmission.id },
      payload: {
        teamId: submission.teamId,
        deliverableId: submission.deliverableId,
        submission: serializeSubmission(updatedSubmission),
      },
    });

    return updatedSubmission;
  }

  async finalizeSubmission(
    submissionId: string,
    supervisorId: string,
  ) {
    const submission =
      await this.prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          deliverable: {
            include: { phase: true },
          },
        },
      });

    if (!submission) {
      throw new BadRequestException('Submission not found');
    }

    if (submission.deliverable.supervisorId !== supervisorId) {
      throw new ForbiddenException(
        'You can only finalize submissions for your own deliverables',
      );
    }

    if (submission.status !== 'APPROVED') {
      throw new BadRequestException(
        'Only approved submissions can be finalized',
      );
    }

    const existingFinalized =
      await this.prisma.submission.findFirst({
        where: {
          deliverableId: submission.deliverableId,
          teamId: submission.teamId,
          status: 'FINALIZED',
          NOT: { id: submissionId },
        },
        select: { id: true },
      });

    if (existingFinalized) {
      throw new BadRequestException(
        'A submission is already finalized for this deliverable. Unfinalize it before finalizing another.',
      );
    }

    const finalizedAt = new Date();
    const updatedSubmission =
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: 'FINALIZED',
          finalizedAt,
        },
      });

    await this.activityLogsService.logActivity(
      supervisorId,
      'Submission Finalized',
      submission.deliverable.title,
    );

    const coordinators =
      await this.authService.listActiveUserIds(
        submission.workspaceId,
      );
    const coordinatorIds = coordinators.filter(
      (member) => member.role === UserRole.COORDINATOR,
    );

    if (coordinatorIds.length > 0) {
      await this.notificationDispatch.sendBulk(
        coordinatorIds.map((coordinator) => ({
          authUserId: coordinator.id,
          title: 'Submission Ready for Review',
          message: `${submission.deliverable.title} has been finalized and forwarded to the coordinator.`,
          type: 'SUBMISSION_FINALIZED',
          entityType: 'SUBMISSION',
          entityId: submission.id,
          route: '/coordinator/submissions',
        })),
      );
    }

    this.domainEventService.emitSafe<SubmissionSnapshotPayload>({
      name: DomainEvents.SUBMISSION_FINALIZED,
      timestamp: finalizedAt.toISOString(),
      actorId: supervisorId,
      scope: { type: 'workspace', id: submission.workspaceId },
      entity: { type: 'SUBMISSION', id: updatedSubmission.id },
      payload: {
        teamId: submission.teamId,
        deliverableId: submission.deliverableId,
        submission: serializeSubmission(updatedSubmission),
      },
    });

    return updatedSubmission;
  }

  async unfinalizeSubmission(
    submissionId: string,
    supervisorId: string,
  ) {
    const submission =
      await this.prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          deliverable: true,
        },
      });

    if (!submission) {
      throw new BadRequestException('Submission not found');
    }

    if (submission.deliverable.supervisorId !== supervisorId) {
      throw new ForbiddenException(
        'You can only unfinalize submissions for your own deliverables',
      );
    }

    if (submission.status !== 'FINALIZED') {
      throw new BadRequestException(
        'Only finalized submissions can be unfinalized',
      );
    }

    // Block rollback once the submission has entered the evaluation process.
    const evaluationCount =
      await this.prisma.submissionEvaluation.count({
        where: { submissionId },
      });

    if (evaluationCount > 0) {
      throw new BadRequestException(
        'This submission has entered the evaluation process and can no longer be unfinalized',
      );
    }

    const updatedSubmission =
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: 'APPROVED',
          finalizedAt: null,
        },
      });

    await this.activityLogsService.logActivity(
      supervisorId,
      'Submission Unfinalized',
      submission.deliverable.title,
    );

    const activeUsers =
      await this.authService.listActiveUserIds(
        submission.workspaceId,
      );
    const coordinatorIds = activeUsers.filter(
      (member) => member.role === UserRole.COORDINATOR,
    );

    if (coordinatorIds.length > 0) {
      await this.notificationDispatch.sendBulk(
        coordinatorIds.map((coordinator) => ({
          authUserId: coordinator.id,
          title: 'Finalized Submission Withdrawn',
          message: `${submission.deliverable.title} was unfinalized by the supervisor and removed from the final submissions queue.`,
          type: 'SUBMISSION_REVIEWED',
          entityType: 'SUBMISSION',
          entityId: submission.id,
          route: '/coordinator/submissions',
        })),
      );
    }

    this.domainEventService.emitSafe<SubmissionSnapshotPayload>({
      name: DomainEvents.SUBMISSION_UNFINALIZED,
      timestamp: new Date().toISOString(),
      actorId: supervisorId,
      scope: { type: 'workspace', id: submission.workspaceId },
      entity: { type: 'SUBMISSION', id: updatedSubmission.id },
      payload: {
        teamId: submission.teamId,
        deliverableId: submission.deliverableId,
        submission: serializeSubmission(updatedSubmission),
      },
    });

    return updatedSubmission;
  }

  async getFinalizedSubmissions(
    workspaceId: string,
    phaseId?: string,
    page = 1,
    limit = 20,
  ) {
    const pagination = getPaginationParams(page, limit);

    const where = {
      workspaceId,
      status: 'FINALIZED' as const,
      ...(phaseId
        ? { deliverable: { phaseId } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        include: {
          deliverable: {
            include: { phase: true, template: true },
          },
        },
        orderBy: { finalizedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.submission.count({ where }),
    ]);

    return buildPaginatedResponse(
      data,
      total,
      pagination.page,
      pagination.limit,
    );
  }

  async getLatestSubmission(
    deliverableId: string,
    teamId: string,
    authUserId: string,
    role: string,
    authorization: string,
  ) {
    await this.assertCanAccessTeamSubmissions(
      teamId,
      authUserId,
      role,
      authorization,
    );

    return this.prisma.submission.findFirst({
      where: { deliverableId, teamId },
      orderBy: { version: 'desc' },
    });
  }

  async getSubmissionHistory(
    deliverableId: string,
    teamId: string,
    authUserId: string,
    role: string,
    authorization: string,
  ) {
    await this.assertCanAccessTeamSubmissions(
      teamId,
      authUserId,
      role,
      authorization,
    );

    return this.prisma.submission.findMany({
      where: { deliverableId, teamId },
      include: {
        attachments: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { version: 'desc' },
    });
  }

  async getTeamSubmissions(
    teamId: string,
    authUserId: string,
    role: string,
    authorization: string,
  ) {
    await this.assertCanAccessTeamSubmissions(
      teamId,
      authUserId,
      role,
      authorization,
    );

    return this.prisma.submission.findMany({
      where: { teamId },
      include: {
        deliverable: true,
        attachments: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  private async assertCanAccessTeamSubmissions(
    teamId: string,
    authUserId: string,
    role: string,
    authorization: string,
  ) {
    if (role === 'COORDINATOR') {
      return;
    }

    if (role === 'STUDENT') {
      await this.teamAccessService.assertTeamMember(
        teamId,
        authorization,
      );
      return;
    }

    if (role === 'SUPERVISOR') {
      const submissionCount =
        await this.prisma.submission.count({
          where: {
            teamId,
            deliverable: {
              supervisorId: authUserId,
            },
          },
        });

      if (submissionCount === 0) {
        throw new ForbiddenException(
          'You do not have access to this team\'s submissions',
        );
      }

      return;
    }

    throw new ForbiddenException('Access denied');
  }
}
