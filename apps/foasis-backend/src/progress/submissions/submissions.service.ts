import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { TeamAccessService } from '../common/team-access.service';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import {
  buildPaginatedResponse,
  getPaginationParams,
} from '../../common/helpers/pagination';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly teamAccessService: TeamAccessService,
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
      latestSubmission?.status === 'APPROVED'
    ) {
      throw new BadRequestException(
        'This deliverable is already approved and cannot be re-submitted',
      );
    }

    const nextVersion =
      existingSubmissions.length > 0
        ? existingSubmissions[0].version + 1
        : 1;

    const submission =
      await this.prisma.submission.create({
        data: {
          deliverableId: dto.deliverableId,
          teamId: team.id,
          version: nextVersion,
          fileUrl: dto.fileUrl,
          remarks: dto.remarks,
        },
      });

    await this.activityLogsService.logActivity(
      authUserId,
      'Document Submitted',
      `${deliverable.title} (v${nextVersion})`,
    );

    await this.notifySupervisor(
      deliverable.supervisorId,
      {
        title: 'New Submission Received',
        message: `A team submitted ${deliverable.title} (v${nextVersion}).`,
        type: 'NEW_SUBMISSION',
        entityType: 'SUBMISSION',
        entityId: submission.id,
        route: '/supervisor/reviews',
      },
    );

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

    await this.notifyTeamMembers(
      submission.teamId,
      {
        title: 'Submission Reviewed',
        message: `Feedback has been provided for ${submission.deliverable.title}.`,
        type: 'SUBMISSION_REVIEWED',
        entityType: 'SUBMISSION',
        entityId: submission.id,
        route: '/student/submissions',
      },
    );

    return updatedSubmission;
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
      include: { deliverable: true },
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
