import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ReminderStatus,
  SubmissionEvaluationStatus,
  SubmissionStatus,
  UserRole,
} from '@prisma/client';

import { AppUrlsService } from '../../common/app-urls.service';
import { EmailService } from '../../email/email.service';
import {
  buildEvaluationAssignmentEmail,
  buildEvaluationReminderEmail,
} from '../../email/email.templates';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamsService } from '../../teams/teams.service';
import { ProfilesService } from '../../users/profiles.service';
import { DomainEvents } from '../../domain-events/domain-event.constants';
import { DomainEventService } from '../../domain-events/domain-event.service';
import type {
  GpaRecalculatedPayload,
  SubmissionEvaluationRealtimePayload,
} from '../../domain-events/domain-event.types';
import { GpaCalculationService } from '../gpa/gpa-calculation.service';
import { ReminderTypes } from '../reminders/reminder.types';

import { AssignEvaluatorDto, AssignEvaluatorsDto, SaveEvaluationDraftDto } from './dto/assign-evaluator.dto';
import { AssignSupervisorEvaluatorDto } from './dto/assign-supervisor-evaluator.dto';
import { resolveEvaluationAggregateStatus } from './submission-scoring.util';
import { MembershipBootstrapService } from '../../workspace/membership-bootstrap.service';

const evaluationInclude = {
  submission: {
    select: {
      id: true,
      fileUrl: true,
      version: true,
      finalizedAt: true,
      status: true,
    },
  },
  deliverable: {
    select: {
      id: true,
      title: true,
      supervisorId: true,
      phaseId: true,
      phase: { select: { id: true, name: true } },
    },
  },
  template: {
    select: {
      id: true,
      title: true,
      totalMarks: true,
      weightagePercent: true,
      rubricCriteria: { orderBy: { sortOrder: 'asc' as const } },
    },
  },
  studentScores: {
    include: {
      criterionScores: {
        include: {
          rubricCriterion: {
            select: {
              id: true,
              title: true,
              maxMarks: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  },
};

@Injectable()
export class SubmissionEvaluationsService {
  private readonly logger = new Logger(SubmissionEvaluationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly profilesService: ProfilesService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly gpaCalculationService: GpaCalculationService,
    private readonly domainEventService: DomainEventService,
    private readonly emailService: EmailService,
    private readonly appUrls: AppUrlsService,
    private readonly membershipBootstrap: MembershipBootstrapService,
  ) {}

  private async emailEvaluatorAssignment(input: {
    evaluatorId: string;
    evaluationId: string;
    deliverableTitle: string;
    teamId: string;
    phaseId: string | null;
    submissionVersion: number;
  }) {
    const [evaluator, team, phase] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: input.evaluatorId },
        select: { email: true },
      }),
      this.prisma.team.findUnique({
        where: { id: input.teamId },
        select: { name: true, projectTitle: true },
      }),
      input.phaseId
        ? this.prisma.phase.findUnique({
            where: { id: input.phaseId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

    if (!evaluator?.email) {
      this.logger.warn(
        `Evaluator ${input.evaluatorId} has no email; skipping evaluation-assignment email`,
      );
      return;
    }

    await this.emailService.send(
      buildEvaluationAssignmentEmail({
        to: evaluator.email,
        deliverableTitle: input.deliverableTitle,
        teamName: team?.name || team?.projectTitle || null,
        phaseName: phase?.name ?? null,
        evaluationLabel: `Submission version ${input.submissionVersion}`,
        actionUrl: this.appUrls.portalUrl(
          `/evaluator/evaluations/${encodeURIComponent(input.evaluationId)}`,
        ),
      }),
    );
  }

  private emitSubmissionEvaluationEvent(
    name:
      | typeof DomainEvents.SUBMISSION_EVALUATION_ASSIGNED
      | typeof DomainEvents.SUBMISSION_EVALUATION_UPDATED
      | typeof DomainEvents.SUBMISSION_EVALUATION_SUBMITTED,
    actorId: string,
    payload: SubmissionEvaluationRealtimePayload,
  ) {
    this.domainEventService.emitSafe<SubmissionEvaluationRealtimePayload>({
      name,
      timestamp: new Date().toISOString(),
      actorId,
      scope: { type: 'workspace', id: payload.workspaceId },
      entity: { type: 'SUBMISSION_EVALUATION', id: payload.evaluationId },
      payload,
    });
  }

  private async loadEvaluatorSummaries(evaluatorIds: string[]) {
    if (!evaluatorIds.length) {
      return new Map<string, { id: string; fullName: string; email: string }>();
    }

    const [profiles, users] = await Promise.all([
      this.profilesService.findManyByAuthUserIds(evaluatorIds),
      this.prisma.user.findMany({
        where: { id: { in: evaluatorIds } },
        select: { id: true, email: true, fullName: true },
      }),
    ]);

    return new Map(
      users.map((user) => [
        user.id,
        {
          id: user.id,
          fullName:
            profiles[user.id]?.fullName ?? user.fullName ?? 'Evaluator',
          email: user.email,
        },
      ]),
    );
  }

  async listEligibleSubmissions(
    workspaceId: string,
    filters?: {
      phaseId?: string;
      templateId?: string;
      supervisorId?: string;
      teamId?: string;
      evaluationStatus?: string;
      evaluatorId?: string;
    },
  ) {
    const submissions = await this.prisma.submission.findMany({
      where: {
        workspaceId,
        status: SubmissionStatus.FINALIZED,
        deliverable: {
          ...(filters?.phaseId ? { phaseId: filters.phaseId } : {}),
          ...(filters?.templateId
            ? { templateId: filters.templateId }
            : {}),
          ...(filters?.supervisorId
            ? { supervisorId: filters.supervisorId }
            : {}),
          ...(filters?.teamId ? { teamId: filters.teamId } : {}),
        },
      },
      include: {
        deliverable: {
          include: {
            phase: { select: { id: true, name: true } },
            template: {
              select: {
                id: true,
                title: true,
                totalMarks: true,
              },
            },
          },
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
      orderBy: { finalizedAt: 'desc' },
    });

    const teamIds = [...new Set(submissions.map((s) => s.teamId))];
    const supervisorIds = [
      ...new Set(submissions.map((s) => s.deliverable.supervisorId)),
    ];
    const evaluatorIds = [
      ...new Set(
        submissions.flatMap((s) =>
          s.evaluations.map((e) => e.evaluatorId),
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
      this.loadEvaluatorSummaries(supervisorIds),
      this.loadEvaluatorSummaries(evaluatorIds),
    ]);

    const teamById = new Map<string, string>(
      teams.map((team) => [
        team.id,
        team.name || team.projectTitle || 'Team',
      ] as const),
    );

    let rows = submissions.map((submission) => {
      const evaluations = submission.evaluations.map((evaluation) => ({
        evaluationId: evaluation.id,
        evaluatorId: evaluation.evaluatorId,
        evaluator:
          evaluators.get(evaluation.evaluatorId) ?? null,
        status: evaluation.status,
      }));

      const evaluationStatus = resolveEvaluationAggregateStatus(
        submission.evaluations,
      );

      return {
        submissionId: submission.id,
        deliverableId: submission.deliverableId,
        teamId: submission.teamId,
        teamName: teamById.get(submission.teamId) ?? 'Team',
        templateId: submission.deliverable.templateId,
        deliverableTitle: submission.deliverable.title,
        phase: submission.deliverable.phase,
        supervisor: supervisors.get(
          submission.deliverable.supervisorId,
        ) ?? {
          id: submission.deliverable.supervisorId,
          fullName: 'Supervisor',
          email: '',
        },
        submissionStatus: submission.status,
        finalizedAt: submission.finalizedAt,
        fileUrl: submission.fileUrl,
        attachments:
          submission.attachments.length > 0
            ? submission.attachments
            : submission.fileUrl
              ? [
                  {
                    id: `${submission.id}-primary`,
                    fileUrl: submission.fileUrl,
                    fileName: 'Submission file',
                  },
                ]
              : [],
        evaluationStatus,
        evaluations,
        assignedEvaluatorCount: evaluations.length,
        submittedEvaluatorCount: evaluations.filter(
          (item) => item.status === 'SUBMITTED',
        ).length,
      };
    });

    if (filters?.evaluationStatus) {
      rows = rows.filter(
        (row) => row.evaluationStatus === filters.evaluationStatus,
      );
    }

    if (filters?.evaluatorId) {
      rows = rows.filter((row) =>
        row.evaluations.some(
          (item) => item.evaluatorId === filters.evaluatorId,
        ),
      );
    }

    return rows;
  }

  async listWorkspaceEvaluators(workspaceId: string) {
    const memberships = await this.prisma.workspaceMembership.findMany({
      where: {
        workspaceId,
        role: UserRole.EVALUATOR,
        isActive: true,
      },
      select: { userId: true },
    });

    const evaluatorIds = memberships.map((m) => m.userId);
    const summaries = await this.loadEvaluatorSummaries(evaluatorIds);

    return evaluatorIds.map(
      (id) =>
        summaries.get(id) ?? {
          id,
          fullName: 'Evaluator',
          email: '',
        },
    );
  }

  async assignEvaluator(
    workspaceId: string,
    coordinatorId: string,
    dto: AssignEvaluatorDto,
  ) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: dto.submissionId,
        workspaceId,
        status: SubmissionStatus.FINALIZED,
      },
      include: {
        deliverable: {
          select: {
            id: true,
            title: true,
            templateId: true,
            teamId: true,
            phaseId: true,
          },
        },
        evaluations: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(
        'Finalized submission not found',
      );
    }

    if (!submission.deliverable.templateId) {
      throw new BadRequestException(
        'Submission deliverable has no template',
      );
    }

    const evaluatorMembership =
      await this.prisma.workspaceMembership.findFirst({
        where: {
          workspaceId,
          userId: dto.evaluatorId,
          role: UserRole.EVALUATOR,
          isActive: true,
        },
      });

    if (!evaluatorMembership) {
      throw new BadRequestException(
        'Selected user is not an active evaluator in this workspace',
      );
    }

    const existingForEvaluator = submission.evaluations.find(
      (item) => item.evaluatorId === dto.evaluatorId,
    );

    if (existingForEvaluator) {
      throw new BadRequestException(
        'This evaluator is already assigned to the submission',
      );
    }

    const evaluation = await this.prisma.submissionEvaluation.create({
      data: {
        workspaceId,
        submissionId: submission.id,
        deliverableId: submission.deliverableId,
        teamId: submission.teamId,
        templateId: submission.deliverable.templateId,
        evaluatorId: dto.evaluatorId,
        assignedById: coordinatorId,
        status: SubmissionEvaluationStatus.ASSIGNED,
      },
      include: evaluationInclude,
    });

    await this.notificationDispatch.send({
      authUserId: dto.evaluatorId,
      title: 'Evaluation assignment',
      message: `You have been assigned to evaluate ${submission.deliverable.title}.`,
      type: 'EVALUATOR_ASSIGNMENT',
      entityType: 'SUBMISSION_EVALUATION',
      entityId: evaluation.id,
      route: `/evaluator/evaluations/${evaluation.id}`,
    });

    void this.emailEvaluatorAssignment({
      evaluatorId: dto.evaluatorId,
      evaluationId: evaluation.id,
      deliverableTitle: submission.deliverable.title,
      teamId: submission.teamId,
      phaseId: submission.deliverable.phaseId,
      submissionVersion: submission.version,
    }).catch((error) => {
      this.logger.warn(
        `Failed to send evaluation-assignment email for ${evaluation.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    this.emitSubmissionEvaluationEvent(
      DomainEvents.SUBMISSION_EVALUATION_ASSIGNED,
      coordinatorId,
      {
        workspaceId,
        evaluationId: evaluation.id,
        submissionId: evaluation.submissionId,
        deliverableId: evaluation.deliverableId,
        teamId: evaluation.teamId,
        evaluatorId: evaluation.evaluatorId,
        status: evaluation.status,
        deliverableTitle: submission.deliverable.title,
        phaseId: submission.deliverable.phaseId,
      },
    );

    return evaluation;
  }

  async assignEvaluators(
    workspaceId: string,
    coordinatorId: string,
    dto: AssignEvaluatorsDto,
  ) {
    const evaluatorIds = [...new Set(dto.evaluatorIds.filter(Boolean))];

    if (!evaluatorIds.length) {
      throw new BadRequestException('Select at least one evaluator');
    }

    const created: Awaited<ReturnType<typeof this.assignEvaluator>>[] = [];
    for (const evaluatorId of evaluatorIds) {
      created.push(
        await this.assignEvaluator(workspaceId, coordinatorId, {
          submissionId: dto.submissionId,
          evaluatorId,
        }),
      );
    }

    return created;
  }

  /**
   * Assign the team's current supervisor as an evaluator for a finalized submission.
   * Ensures EVALUATOR membership exists for supervisors who only hold SUPERVISOR role.
   */
  async assignSupervisorAsEvaluator(
    workspaceId: string,
    coordinatorId: string,
    dto: AssignSupervisorEvaluatorDto,
  ) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: dto.submissionId,
        workspaceId,
        status: SubmissionStatus.FINALIZED,
      },
      select: {
        id: true,
        teamId: true,
        deliverable: {
          select: {
            supervisorId: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Finalized submission not found');
    }

    const proposal = await this.prisma.proposal.findUnique({
      where: { teamId: submission.teamId },
      select: { assignedSupervisorId: true },
    });

    const supervisorId =
      proposal?.assignedSupervisorId ||
      submission.deliverable.supervisorId ||
      null;

    if (!supervisorId) {
      throw new BadRequestException(
        'This team does not have an assigned supervisor',
      );
    }

    await this.membershipBootstrap.ensureEvaluatorMembership(
      workspaceId,
      supervisorId,
    );

    return this.assignEvaluator(workspaceId, coordinatorId, {
      submissionId: submission.id,
      evaluatorId: supervisorId,
    });
  }

  async remindPendingEvaluators(
    workspaceId: string,
    coordinatorId: string,
    submissionId: string,
    evaluatorIds?: string[],
  ) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        workspaceId,
        status: SubmissionStatus.FINALIZED,
      },
      include: {
        deliverable: {
          select: {
            id: true,
            title: true,
            phaseId: true,
            phase: { select: { name: true } },
          },
        },
        evaluations: {
          where: {
            status: {
              in: [
                SubmissionEvaluationStatus.ASSIGNED,
                SubmissionEvaluationStatus.IN_PROGRESS,
              ],
            },
          },
          select: {
            id: true,
            evaluatorId: true,
            status: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Finalized submission not found');
    }

    if (!submission.evaluations.length) {
      throw new BadRequestException(
        'There are no pending evaluations to remind for this submission',
      );
    }

    const selectedEvaluatorIds = evaluatorIds?.length
      ? [...new Set(evaluatorIds.map((id) => id.trim()))]
      : undefined;

    const evaluationsToRemind = selectedEvaluatorIds?.length
      ? submission.evaluations.filter((item) =>
          selectedEvaluatorIds.includes(item.evaluatorId),
        )
      : submission.evaluations;

    if (!evaluationsToRemind.length) {
      throw new BadRequestException(
        'None of the selected evaluators have a pending evaluation for this submission',
      );
    }

    const team = await this.prisma.team.findUnique({
      where: { id: submission.teamId },
      select: { name: true, projectTitle: true },
    });
    const teamName = team?.name || team?.projectTitle || 'Team';
    const phaseName = submission.deliverable.phase?.name ?? null;
    const deliverableTitle = submission.deliverable.title;

    const evaluatorIdsToNotify = [
      ...new Set(evaluationsToRemind.map((item) => item.evaluatorId)),
    ];
    const evaluators = await this.prisma.user.findMany({
      where: { id: { in: evaluatorIdsToNotify } },
      select: { id: true, email: true, fullName: true },
    });
    const evaluatorById = new Map(
      evaluators.map((evaluator) => [evaluator.id, evaluator]),
    );

    let remindedCount = 0;

    for (const evaluation of evaluationsToRemind) {
      const route = `/evaluator/evaluations/${evaluation.id}`;
      const statusLabel =
        evaluation.status === SubmissionEvaluationStatus.IN_PROGRESS
          ? 'In progress'
          : 'Assigned';
      const title = 'Evaluation reminder';
      const message = `Please complete your evaluation for ${deliverableTitle} (${teamName}).`;

      await this.notificationDispatch.send({
        authUserId: evaluation.evaluatorId,
        title,
        message,
        type: 'EVALUATION_REMINDER',
        entityType: 'SUBMISSION_EVALUATION',
        entityId: evaluation.id,
        route,
      });

      const evaluator = evaluatorById.get(evaluation.evaluatorId);
      if (evaluator?.email) {
        void this.emailService
          .send(
            buildEvaluationReminderEmail({
              to: evaluator.email,
              deliverableTitle,
              teamName,
              phaseName,
              statusLabel,
              actionUrl: this.appUrls.portalUrl(route),
            }),
          )
          .catch((error) => {
            this.logger.warn(
              `Failed to send evaluation-reminder email for ${evaluation.id}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          });
      }

      await this.prisma.scheduledReminder.create({
        data: {
          workspaceId,
          reminderType: ReminderTypes.EVALUATOR_EVALUATION_PENDING,
          entityType: 'SUBMISSION_EVALUATION',
          entityId: evaluation.id,
          title,
          message,
          route,
          channels: ['notification', 'email'],
          audienceSpec: {
            roles: ['EVALUATOR'],
            userIds: [evaluation.evaluatorId],
          },
          scheduledFor: new Date(),
          status: ReminderStatus.SENT,
          sentAt: new Date(),
          metadata: {
            submissionId,
            deliverableId: submission.deliverableId,
            sentByCoordinatorId: coordinatorId,
          },
        },
      });

      remindedCount += 1;
    }

    return {
      success: true,
      remindedCount,
      remindedAt: new Date().toISOString(),
    };
  }

  async getMyEvaluations(
    workspaceId: string,
    evaluatorId: string,
    status?: SubmissionEvaluationStatus,
  ) {
    const evaluations = await this.prisma.submissionEvaluation.findMany({
      where: {
        workspaceId,
        evaluatorId,
        ...(status ? { status } : {}),
      },
      include: evaluationInclude,
      orderBy: { createdAt: 'desc' },
    });

    const teamIds = [...new Set(evaluations.map((evaluation) => evaluation.teamId))];
    const supervisorIds = [
      ...new Set(evaluations.map((evaluation) => evaluation.deliverable.supervisorId)),
    ];

    const [teams, supervisors] = await Promise.all([
      teamIds.length
        ? this.prisma.team.findMany({
            where: { id: { in: teamIds } },
            select: { id: true, name: true, projectTitle: true },
          })
        : Promise.resolve([]),
      this.loadEvaluatorSummaries(supervisorIds),
    ]);

    const teamById = new Map<string, string>(
      teams.map((team) => [
        team.id,
        team.name || team.projectTitle || 'Team',
      ] as const),
    );

    return evaluations.map((evaluation) => ({
      ...evaluation,
      teamName: teamById.get(evaluation.teamId) ?? 'Team',
      supervisor:
        supervisors.get(evaluation.deliverable.supervisorId) ?? {
          id: evaluation.deliverable.supervisorId,
          fullName: 'Supervisor',
          email: '',
        },
      isReadOnly: evaluation.status === SubmissionEvaluationStatus.SUBMITTED,
      teamMembers: [],
    }));
  }

  /**
   * Student-facing Phase 6 status: one row per deliverable/submission
   * with aggregate evaluator workflow status.
   */
  async getTeamDeliverableEvaluationStatuses(
    workspaceId: string,
    teamId: string,
  ) {
    const evaluations = await this.prisma.submissionEvaluation.findMany({
      where: { workspaceId, teamId },
      select: {
        id: true,
        submissionId: true,
        deliverableId: true,
        status: true,
        evaluatorId: true,
        submittedAt: true,
        createdAt: true,
        deliverable: {
          select: {
            title: true,
            phaseId: true,
            phase: { select: { id: true, name: true } },
          },
        },
        template: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const bySubmission = new Map<
      string,
      {
        submissionId: string;
        deliverableId: string;
        deliverableTitle: string;
        phaseId: string | null;
        phaseName: string | null;
        templateId: string;
        templateTitle: string;
        evaluations: Array<{
          id: string;
          status: SubmissionEvaluationStatus;
          evaluatorId: string;
          submittedAt: Date | null;
        }>;
      }
    >();

    for (const evaluation of evaluations) {
      const existing = bySubmission.get(evaluation.submissionId);
      const entry = existing ?? {
        submissionId: evaluation.submissionId,
        deliverableId: evaluation.deliverableId,
        deliverableTitle: evaluation.deliverable.title,
        phaseId: evaluation.deliverable.phaseId,
        phaseName: evaluation.deliverable.phase?.name ?? null,
        templateId: evaluation.template.id,
        templateTitle: evaluation.template.title,
        evaluations: [],
      };

      entry.evaluations.push({
        id: evaluation.id,
        status: evaluation.status,
        evaluatorId: evaluation.evaluatorId,
        submittedAt: evaluation.submittedAt,
      });

      bySubmission.set(evaluation.submissionId, entry);
    }

    return [...bySubmission.values()].map((item) => ({
      submissionId: item.submissionId,
      deliverableId: item.deliverableId,
      deliverableTitle: item.deliverableTitle,
      phaseId: item.phaseId,
      phaseName: item.phaseName,
      templateId: item.templateId,
      templateTitle: item.templateTitle,
      status: resolveEvaluationAggregateStatus(item.evaluations),
      evaluatorCount: item.evaluations.length,
      submittedEvaluatorCount: item.evaluations.filter(
        (evaluation) => evaluation.status === 'SUBMITTED',
      ).length,
      evaluations: item.evaluations,
    }));
  }

  async getEvaluationForEvaluator(
    workspaceId: string,
    evaluationId: string,
    evaluatorId: string,
  ) {
    const evaluation =
      await this.prisma.submissionEvaluation.findFirst({
        where: {
          id: evaluationId,
          workspaceId,
          evaluatorId,
        },
        include: evaluationInclude,
      });

    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }

    const teamMembers = await this.teamsService.getTeamMembers(
      evaluation.teamId,
    );

    return {
      ...evaluation,
      teamMembers,
      isReadOnly: evaluation.status === SubmissionEvaluationStatus.SUBMITTED,
    };
  }

  private validateCriterionScores(
    rubricCriteria: { id: string; title: string; maxMarks: number }[],
    studentScores: SaveEvaluationDraftDto['studentScores'],
  ) {
    const criterionById = new Map(
      rubricCriteria.map((c) => [c.id, c]),
    );

    for (const studentScore of studentScores) {
      let total = 0;

      for (const criterionScore of studentScore.criterionScores) {
        const criterion = criterionById.get(
          criterionScore.rubricCriterionId,
        );

        if (!criterion) {
          throw new BadRequestException(
            'One or more rubric criteria in the score payload are invalid',
          );
        }

        if (criterionScore.marksAwarded > criterion.maxMarks) {
          throw new BadRequestException(
            `Marks for "${criterion.title}" cannot exceed ${criterion.maxMarks}.`,
          );
        }

        if (criterionScore.marksAwarded < 0) {
          throw new BadRequestException('Marks cannot be negative');
        }

        total += criterionScore.marksAwarded;
      }

      if (
        Math.abs(total - studentScore.totalMarks) > 0.001
      ) {
        throw new BadRequestException(
          'Total marks must equal the sum of criterion marks',
        );
      }
    }
  }

  async saveDraft(
    workspaceId: string,
    evaluationId: string,
    evaluatorId: string,
    dto: SaveEvaluationDraftDto,
  ) {
    const evaluation = await this.assertEditableEvaluation(
      workspaceId,
      evaluationId,
      evaluatorId,
    );

    await this.assertStudentScoresBelongToTeam(
      evaluation.teamId,
      dto.studentScores,
    );

    const rubricCriteria = evaluation.template.rubricCriteria;
    this.validateCriterionScores(rubricCriteria, dto.studentScores);

    await this.prisma.$transaction(async (tx) => {
      await tx.studentSubmissionEvaluation.deleteMany({
        where: { submissionEvaluationId: evaluationId },
      });

      for (const studentScore of dto.studentScores) {
        await tx.studentSubmissionEvaluation.create({
          data: {
            submissionEvaluationId: evaluationId,
            studentId: studentScore.studentId,
            totalMarks: studentScore.totalMarks,
            remarks: studentScore.remarks?.trim() || null,
            criterionScores: {
              create: studentScore.criterionScores.map(
                (score) => ({
                  rubricCriterionId: score.rubricCriterionId,
                  marksAwarded: score.marksAwarded,
                }),
              ),
            },
          },
        });
      }

      await tx.submissionEvaluation.update({
        where: { id: evaluationId },
        data: {
          status: SubmissionEvaluationStatus.IN_PROGRESS,
        },
      });
    });

    this.emitSubmissionEvaluationEvent(
      DomainEvents.SUBMISSION_EVALUATION_UPDATED,
      evaluatorId,
      {
        workspaceId,
        evaluationId,
        submissionId: evaluation.submissionId,
        deliverableId: evaluation.deliverableId,
        teamId: evaluation.teamId,
        evaluatorId,
        status: SubmissionEvaluationStatus.IN_PROGRESS,
        deliverableTitle:
          evaluation.deliverable?.title ?? evaluation.template.title,
        phaseId: evaluation.deliverable?.phaseId ?? null,
      },
    );

    return this.getEvaluationForEvaluator(
      workspaceId,
      evaluationId,
      evaluatorId,
    );
  }

  async submitEvaluation(
    workspaceId: string,
    evaluationId: string,
    evaluatorId: string,
    dto: SaveEvaluationDraftDto,
  ) {
    const evaluation = await this.assertEditableEvaluation(
      workspaceId,
      evaluationId,
      evaluatorId,
    );

    const teamMembers = await this.assertStudentScoresBelongToTeam(
      evaluation.teamId,
      dto.studentScores,
    );

    if (dto.studentScores.length !== teamMembers.length) {
      throw new BadRequestException(
        'Scores must be provided for every team member',
      );
    }

    await this.saveDraft(
      workspaceId,
      evaluationId,
      evaluatorId,
      dto,
    );

    const submitted = await this.prisma.submissionEvaluation.update({
      where: { id: evaluationId },
      data: {
        status: SubmissionEvaluationStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: evaluationInclude,
    });

    const deliverable = await this.prisma.deliverable.findFirst({
      where: { id: submitted.deliverableId },
      select: { phaseId: true, title: true, supervisorId: true },
    });

    if (deliverable?.phaseId) {
      await this.gpaCalculationService.recalculateForTeamPhase(
        workspaceId,
        deliverable.phaseId,
        submitted.teamId,
      );

      this.domainEventService.emitSafe<GpaRecalculatedPayload>({
        name: DomainEvents.GPA_RECALCULATED,
        timestamp: new Date().toISOString(),
        actorId: evaluatorId,
        scope: { type: 'workspace', id: workspaceId },
        entity: { type: 'PHASE', id: deliverable.phaseId },
        payload: {
          workspaceId,
          phaseId: deliverable.phaseId,
          teamId: submitted.teamId,
        },
      });
    }

    const coordinatorMemberships =
      await this.prisma.workspaceMembership.findMany({
        where: {
          workspaceId,
          role: UserRole.COORDINATOR,
          isActive: true,
        },
        select: { userId: true },
      });

    const deliverableTitle =
      deliverable?.title ?? 'a deliverable';

    await Promise.allSettled(
      coordinatorMemberships.map((membership) =>
        this.notificationDispatch.send({
          authUserId: membership.userId,
          title: 'Evaluation submitted',
          message: `An evaluation for ${deliverableTitle} has been submitted.`,
          type: 'EVALUATION_SUBMITTED',
          entityType: 'SUBMISSION',
          entityId: submitted.submissionId,
          route: '/coordinator/results',
        }),
      ),
    );

    if (
      deliverable?.supervisorId &&
      deliverable.supervisorId !== evaluatorId
    ) {
      await this.notificationDispatch.send({
        authUserId: deliverable.supervisorId,
        title: 'Evaluation submitted',
        message: `An evaluation for ${deliverableTitle} has been submitted for your supervised team.`,
        type: 'EVALUATION_SUBMITTED',
        entityType: 'SUBMISSION',
        entityId: submitted.submissionId,
        route: '/supervisor/results',
      });
    }

    await Promise.allSettled(
      teamMembers.map((member) =>
        this.notificationDispatch.send({
          authUserId: member.authUserId,
          title: 'Evaluation results updated',
          message: `Marks for ${deliverableTitle} have been submitted. Check your results.`,
          type: 'RESULT_PUBLISHED',
          entityType: 'SUBMISSION',
          entityId: submitted.submissionId,
          route: '/student/results',
        }),
      ),
    );

    this.emitSubmissionEvaluationEvent(
      DomainEvents.SUBMISSION_EVALUATION_SUBMITTED,
      evaluatorId,
      {
        workspaceId,
        evaluationId,
        submissionId: submitted.submissionId,
        deliverableId: submitted.deliverableId,
        teamId: submitted.teamId,
        evaluatorId,
        status: SubmissionEvaluationStatus.SUBMITTED,
        deliverableTitle: deliverable?.title,
        phaseId: deliverable?.phaseId ?? null,
      },
    );

    return submitted;
  }

  private async assertStudentScoresBelongToTeam(
    teamId: string,
    studentScores: { studentId: string }[],
  ) {
    const teamMembers = await this.teamsService.getTeamMembers(teamId);
    const memberIds = new Set(
      teamMembers.map((member) => member.authUserId),
    );

    for (const score of studentScores) {
      if (!memberIds.has(score.studentId)) {
        throw new BadRequestException(
          'Invalid student in evaluation payload',
        );
      }
    }

    return teamMembers;
  }

  private async assertEditableEvaluation(
    workspaceId: string,
    evaluationId: string,
    evaluatorId: string,
  ) {
    const evaluation =
      await this.prisma.submissionEvaluation.findFirst({
        where: {
          id: evaluationId,
          workspaceId,
          evaluatorId,
        },
        include: {
          template: {
            include: {
              rubricCriteria: { orderBy: { sortOrder: 'asc' } },
            },
          },
          deliverable: {
            select: { phaseId: true, title: true },
          },
        },
      });

    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }

    if (evaluation.status === SubmissionEvaluationStatus.SUBMITTED) {
      throw new BadRequestException(
        'Submitted evaluations are read-only',
      );
    }

    return evaluation;
  }
}
