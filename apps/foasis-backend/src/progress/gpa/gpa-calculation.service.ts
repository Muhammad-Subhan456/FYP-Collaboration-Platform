import { Injectable } from '@nestjs/common';
import { SubmissionEvaluationStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { averageTemplateScoreForStudent } from '../submission-evaluations/submission-scoring.util';

/**
 * HEC-style absolute grading scale on phase percentage (0–100).
 */
export type GradingPolicy = {
  calculateGpa: (percentage: number) => number;
};

const DEFAULT_GRADING_POLICY: GradingPolicy = {
  calculateGpa(percentage: number) {
    if (percentage >= 85) return 4.0;
    if (percentage >= 80) return 3.7;
    if (percentage >= 75) return 3.3;
    if (percentage >= 70) return 3.0;
    if (percentage >= 65) return 2.7;
    if (percentage >= 60) return 2.3;
    if (percentage >= 55) return 2.0;
    if (percentage >= 50) return 1.7;
    return 0.0;
  },
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
  constructor(private readonly prisma: PrismaService) {}

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
    const roundedMarks = Math.round(phasePercentage * 100) / 100;

    const canComputeGpa = isComplete;
    const gpa = canComputeGpa
      ? this.getGradingPolicy().calculateGpa(roundedMarks)
      : null;

    return this.prisma.studentPhaseResult.upsert({
      where: {
        phaseId_studentId: { phaseId, studentId },
      },
      create: {
        workspaceId,
        phaseId,
        studentId,
        weightedMarks: roundedMarks,
        gpa: gpa ?? 0,
        isComplete,
        breakdown,
      },
      update: {
        weightedMarks: roundedMarks,
        gpa: gpa ?? 0,
        isComplete,
        breakdown,
        calculatedAt: new Date(),
      },
    });
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
