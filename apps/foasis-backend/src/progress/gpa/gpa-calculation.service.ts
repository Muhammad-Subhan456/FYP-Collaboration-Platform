import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SubmissionEvaluationStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { DomainEvents } from '../../domain-events/domain-event.constants';
import { DomainEventService } from '../../domain-events/domain-event.service';
import type { GpaRecalculatedPayload } from '../../domain-events/domain-event.types';

import { averageTemplateScoreForStudent } from '../submission-evaluations/submission-scoring.util';
import { calculateGradePoints, isOneMarkBelowNextGrade, resolveGrade } from './grading-policy';

/**
 * Official university absolute grading scale on phase percentage (0–100).
 * See `grading-policy.ts` for the letter grade / grade point mapping.
 */
export type GradingPolicy = {
  calculateGpa: (percentage: number) => number;
  resolveGrade: (percentage: number) => { grade: string; gradePoints: number };
};

const DEFAULT_GRADING_POLICY: GradingPolicy = {
  calculateGpa: calculateGradePoints,
  resolveGrade,
};

export type DeliverableBreakdownItem = {
  templateId: string;
  deliverableTitle: string;
  totalMarks: number;
  weightagePercent: number;
  effectiveWeightPercent: number;
  studentMarks: number;
  percentage: number;
  weightedContribution: number;
  evaluationStatus: 'PENDING' | 'SUBMITTED';
  evaluatorCount: number;
  submittedEvaluatorCount: number;
};

@Injectable()
export class GpaCalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEventService: DomainEventService,
  ) {}

  getGradingPolicy(): GradingPolicy {
    return DEFAULT_GRADING_POLICY;
  }

  /**
   * Phase percentage used for GPA:
   *   sum(deliverablePercentage_i * effectiveWeight_i) / sum(effectiveWeight_i)
   *
   * effectiveWeight:
   * - configured weightage when > 0
   * - equal share when all applicable templates have weightage 0
   *   (prevents GPA collapsing to 0 solely because weightages were never set)
   */
  async recalculateForStudentPhase(
    workspaceId: string,
    phaseId: string,
    studentId: string,
  ) {
    const phase = await this.prisma.phase.findFirst({
      where: { id: phaseId, workspaceId },
      include: {
        templates: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            weightagePercent: true,
          },
        },
      },
    });

    if (!phase) {
      return null;
    }

    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        authUserId: studentId,
        team: { workspaceId },
      },
      select: { teamId: true },
    });

    if (!teamMember) {
      return null;
    }

    const teamDeliverables = await this.prisma.deliverable.findMany({
      where: {
        workspaceId,
        phaseId,
        teamId: teamMember.teamId,
        templateId: { not: null },
        isActive: true,
      },
      select: { templateId: true },
    });

    const applicableTemplateIds = new Set(
      teamDeliverables
        .map((deliverable) => deliverable.templateId)
        .filter((templateId): templateId is string => !!templateId),
    );

    const applicableTemplates = phase.templates.filter((template) =>
      applicableTemplateIds.has(template.id),
    );

    if (!applicableTemplates.length) {
      return null;
    }

    const templatesWithWeight = applicableTemplates.filter(
      (template) => Number(template.weightagePercent) > 0,
    );
    const useEqualWeights = templatesWithWeight.length === 0;
    const templates = useEqualWeights
      ? applicableTemplates
      : templatesWithWeight;

    const evaluations = await this.prisma.submissionEvaluation.findMany({
      where: {
        workspaceId,
        teamId: teamMember.teamId,
        templateId: { in: templates.map((template) => template.id) },
      },
      include: {
        studentScores: {
          where: { studentId },
          include: {
            criterionScores: {
              include: {
                rubricCriterion: {
                  select: {
                    id: true,
                    title: true,
                    maxMarks: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const evaluationsByTemplateId = new Map<string, typeof evaluations>();
    for (const evaluation of evaluations) {
      const existing =
        evaluationsByTemplateId.get(evaluation.templateId) ?? [];
      existing.push(evaluation);
      evaluationsByTemplateId.set(evaluation.templateId, existing);
    }

    const equalWeight =
      templates.length > 0 ? 100 / templates.length : 0;

    const breakdown: DeliverableBreakdownItem[] = templates.map((template) => {
      const configuredWeight = Number(template.weightagePercent);
      const effectiveWeight = useEqualWeights
        ? equalWeight
        : configuredWeight;
      const templateEvaluations =
        evaluationsByTemplateId.get(template.id) ?? [];
      const averagedMarks = averageTemplateScoreForStudent(
        templateEvaluations,
        studentId,
      );
      const studentMarks = averagedMarks ?? 0;
      const submittedEvaluatorCount = templateEvaluations.filter(
        (item) => item.status === SubmissionEvaluationStatus.SUBMITTED,
      ).length;
      const percentage =
        template.totalMarks > 0
          ? (studentMarks / template.totalMarks) * 100
          : 0;
      const weightedContribution = (percentage * effectiveWeight) / 100;

      return {
        templateId: template.id,
        deliverableTitle: template.title,
        totalMarks: template.totalMarks,
        weightagePercent: configuredWeight,
        effectiveWeightPercent: Math.round(effectiveWeight * 100) / 100,
        studentMarks,
        percentage: Math.round(percentage * 100) / 100,
        weightedContribution: Math.round(weightedContribution * 100) / 100,
        evaluationStatus:
          submittedEvaluatorCount > 0 ? 'SUBMITTED' : 'PENDING',
        evaluatorCount: templateEvaluations.length,
        submittedEvaluatorCount,
      };
    });

    const evaluatedCount = breakdown.filter(
      (item) => item.evaluationStatus === 'SUBMITTED',
    ).length;
    const isComplete = evaluatedCount === templates.length && templates.length > 0;

    const totalEffectiveWeight = breakdown.reduce(
      (sum, item) => sum + item.effectiveWeightPercent,
      0,
    );
    const rawWeightedSum = breakdown.reduce(
      (sum, item) => sum + item.weightedContribution,
      0,
    );

    // Normalize so phase percentage is always on a 0–100 scale even when
    // configured weightages for the applicable set do not sum to 100.
    const phasePercentage =
      totalEffectiveWeight > 0
        ? (rawWeightedSum / totalEffectiveWeight) * 100
        : 0;
    const basePercentage = Math.round(phasePercentage * 100) / 100;

    // Preserve a previously applied discretionary +1 mark promotion across
    // recalculations (e.g. when new evaluations arrive for the phase).
    const existing = await this.prisma.studentPhaseResult.findUnique({
      where: { phaseId_studentId: { phaseId, studentId } },
      select: { promotionApplied: true },
    });
    const promotionApplied = existing?.promotionApplied ?? false;
    const effectivePercentage = promotionApplied
      ? Math.min(100, Math.round((basePercentage + 1) * 100) / 100)
      : basePercentage;

    const canComputeGpa = isComplete;
    const gpa = canComputeGpa
      ? this.getGradingPolicy().calculateGpa(effectivePercentage)
      : null;

    return this.prisma.studentPhaseResult.upsert({
      where: {
        phaseId_studentId: { phaseId, studentId },
      },
      create: {
        workspaceId,
        phaseId,
        studentId,
        weightedMarks: effectivePercentage,
        basePercentage,
        gpa: gpa ?? 0,
        isComplete,
        breakdown,
      },
      update: {
        weightedMarks: effectivePercentage,
        basePercentage,
        gpa: gpa ?? 0,
        isComplete,
        breakdown,
        calculatedAt: new Date(),
      },
    });
  }

  /**
   * Apply the university's discretionary +1 mark grade improvement.
   *
   * Allowed only when the student's phase percentage is exactly one mark below
   * the next grade boundary (so a single mark changes the grade), the phase is
   * fully evaluated, and no promotion has been applied yet.
   */
  async promoteStudentPhaseGrade(
    workspaceId: string,
    phaseId: string,
    studentId: string,
    actor: { id: string; role: string },
  ) {
    if (actor.role === 'SUPERVISOR') {
      const membership = await this.prisma.teamMember.findFirst({
        where: {
          authUserId: studentId,
          team: {
            workspaceId,
            proposal: { assignedSupervisorId: actor.id },
          },
        },
        select: { id: true },
      });

      if (!membership) {
        throw new ForbiddenException(
          'You can only promote grades for students on your supervised teams',
        );
      }
    }

    const result = await this.prisma.studentPhaseResult.findUnique({
      where: { phaseId_studentId: { phaseId, studentId } },
    });

    if (!result || result.workspaceId !== workspaceId) {
      throw new BadRequestException('Phase result not found');
    }

    if (!result.isComplete) {
      throw new BadRequestException(
        'Grade can be promoted only after the phase is fully evaluated',
      );
    }

    if (result.promotionApplied) {
      throw new BadRequestException(
        'This grade has already been promoted for this phase',
      );
    }

    const base = result.basePercentage ?? result.weightedMarks;
    const promotedPercentage = Math.min(
      100,
      Math.round((base + 1) * 100) / 100,
    );

    if (!isOneMarkBelowNextGrade(base)) {
      throw new BadRequestException(
        'This student is not one mark below the next grade boundary',
      );
    }

    const after = resolveGrade(promotedPercentage);

    const updated = await this.prisma.studentPhaseResult.update({
      where: { phaseId_studentId: { phaseId, studentId } },
      data: {
        basePercentage: base,
        weightedMarks: promotedPercentage,
        gpa: after.gradePoints,
        promotionApplied: true,
        promotedById: actor.id,
        promotedAt: new Date(),
        calculatedAt: new Date(),
      },
    });

    const teamMember = await this.prisma.teamMember.findFirst({
      where: { authUserId: studentId, team: { workspaceId } },
      select: { teamId: true },
    });

    this.domainEventService.emitSafe<GpaRecalculatedPayload>({
      name: DomainEvents.GPA_RECALCULATED,
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      scope: { type: 'workspace', id: workspaceId },
      entity: { type: 'PHASE', id: phaseId },
      payload: {
        workspaceId,
        phaseId,
        teamId: teamMember?.teamId ?? '',
      },
    });

    return updated;
  }

  async recalculateForTeamPhase(
    workspaceId: string,
    phaseId: string,
    teamId: string,
  ) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, workspaceId },
      select: { id: true },
    });

    if (!team) {
      return;
    }

    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      select: { authUserId: true },
    });

    await Promise.all(
      members.map((member) =>
        this.recalculateForStudentPhase(
          workspaceId,
          phaseId,
          member.authUserId,
        ),
      ),
    );
  }

  async recalculateForPhase(workspaceId: string, phaseId: string) {
    const deliverables = await this.prisma.deliverable.findMany({
      where: { workspaceId, phaseId, teamId: { not: null } },
      select: { teamId: true },
    });

    const teamIds = [...new Set(deliverables.map((item) => item.teamId!))];
    await Promise.all(
      teamIds.map((teamId) =>
        this.recalculateForTeamPhase(workspaceId, phaseId, teamId),
      ),
    );
  }

  async recalculateAllForWorkspace(workspaceId: string) {
    const phases = await this.prisma.phase.findMany({
      where: { workspaceId },
      select: { id: true },
    });

    await Promise.all(
      phases.map((phase) =>
        this.recalculateForPhase(workspaceId, phase.id),
      ),
    );
  }
}
