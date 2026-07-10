import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SubmissionEvaluationStatus,
  SubmissionStatus,
  UserRole,
} from '@prisma/client';

import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamsService } from '../../teams/teams.service';
import { ProfilesService } from '../../users/profiles.service';
import { GpaCalculationService } from '../gpa/gpa-calculation.service';

import { AssignEvaluatorDto, AssignEvaluatorsDto, SaveEvaluationDraftDto } from './dto/assign-evaluator.dto';
import { resolveEvaluationAggregateStatus } from './submission-scoring.util';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly profilesService: ProfilesService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly gpaCalculationService: GpaCalculationService,
  ) {}

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

    const teamMembers = await this.teamsService.getTeamMembers(
      evaluation.teamId,
    );

    if (dto.studentScores.length !== teamMembers.length) {
      throw new BadRequestException(
        'Scores must be provided for every team member',
      );
    }

    const memberIds = new Set(
      teamMembers.map((m) => m.authUserId),
    );
    for (const score of dto.studentScores) {
      if (!memberIds.has(score.studentId)) {
        throw new BadRequestException(
          'Invalid student in evaluation payload',
        );
      }
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

    await Promise.allSettled(
      coordinatorMemberships.map((membership) =>
        this.notificationDispatch.send({
          authUserId: membership.userId,
          title: 'Evaluation submitted',
          message: `An evaluation for ${deliverable?.title ?? 'a deliverable'} has been submitted.`,
          type: 'EVALUATION_SUBMITTED',
          entityType: 'SUBMISSION_EVALUATION',
          entityId: evaluationId,
          route: '/coordinator/results',
        }),
      ),
    );

    return submitted;
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
