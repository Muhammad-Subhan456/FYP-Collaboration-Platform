import { Injectable } from '@nestjs/common';
import { SubmissionEvaluationStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesService } from '../../users/profiles.service';

import {
  averageStudentDeliverableScores,
  averageTemplateScoreForStudent,
} from './submission-scoring.util';

@Injectable()
export class SubmissionResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
  ) {}

  private async loadPersonNames(userIds: string[]) {
    if (!userIds.length) {
      return new Map<string, string>();
    }

    const [profiles, users] = await Promise.all([
      this.profilesService.findManyByAuthUserIds(userIds),
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true },
      }),
    ]);

    return new Map(
      users.map((user) => [
        user.id,
        profiles[user.id]?.fullName ?? user.fullName ?? 'User',
      ]),
    );
  }

  private async loadEvaluatorNames(evaluatorIds: string[]) {
    return this.loadPersonNames(evaluatorIds);
  }

  private async resolveFilteredStudentIds(
    workspaceId: string,
    filters?: {
      teamId?: string;
      supervisorId?: string;
      templateId?: string;
      evaluatorId?: string;
      studentId?: string;
    },
  ) {
    let studentIds: Set<string> | null = null;

    const intersect = (ids: string[]) => {
      const next = new Set(ids);
      if (!studentIds) {
        studentIds = next;
        return;
      }
      studentIds = new Set([...studentIds].filter((id) => next.has(id)));
    };

    if (filters?.teamId) {
      const members = await this.prisma.teamMember.findMany({
        where: { teamId: filters.teamId },
        select: { authUserId: true },
      });
      intersect(members.map((member) => member.authUserId));
    }

    if (filters?.supervisorId) {
      const members = await this.prisma.teamMember.findMany({
        where: {
          team: {
            workspaceId,
            proposal: { assignedSupervisorId: filters.supervisorId },
          },
        },
        select: { authUserId: true },
      });
      intersect(members.map((member) => member.authUserId));
    }

    if (filters?.templateId) {
      const scores = await this.prisma.studentSubmissionEvaluation.findMany({
        where: {
          submissionEvaluation: {
            workspaceId,
            templateId: filters.templateId,
          },
        },
        select: { studentId: true },
      });
      intersect([...new Set(scores.map((score) => score.studentId))]);
    }

    if (filters?.evaluatorId) {
      const scores = await this.prisma.studentSubmissionEvaluation.findMany({
        where: {
          submissionEvaluation: {
            workspaceId,
            evaluatorId: filters.evaluatorId,
          },
        },
        select: { studentId: true },
      });
      intersect([...new Set(scores.map((score) => score.studentId))]);
    }

    if (filters?.studentId) {
      intersect([filters.studentId]);
    }

    return studentIds;
  }

  private filterPhaseResultsByStudents<T extends { studentId: string }>(
    phaseResults: T[],
    studentIds: Set<string> | null,
  ) {
    if (!studentIds) {
      return phaseResults;
    }

    return phaseResults.filter((result) => studentIds!.has(result.studentId));
  }

  private groupEvaluationsBySubmissionTemplate(
    evaluations: Array<{
      id: string;
      submissionId: string;
      templateId: string;
      teamId: string;
      evaluatorId: string;
      status: SubmissionEvaluationStatus;
      submittedAt: Date | null;
      deliverable: {
        title: string;
        supervisorId?: string;
        phase: { id: string; name: string } | null;
      };
      template: {
        title: string;
        totalMarks: number;
        weightagePercent: unknown;
        rubricCriteria: Array<{
          id: string;
          title: string;
          maxMarks: number;
          sortOrder: number;
        }>;
      };
      studentScores: Array<{
        studentId: string;
        totalMarks: number;
        remarks: string | null;
        criterionScores: Array<{
          rubricCriterionId: string;
          marksAwarded: number;
          rubricCriterion: {
            id: string;
            title: string;
            maxMarks: number;
          };
        }>;
      }>;
    }>,
  ) {
    const groups = new Map<string, typeof evaluations>();

    for (const evaluation of evaluations) {
      const key = `${evaluation.submissionId}:${evaluation.templateId}`;
      const existing = groups.get(key) ?? [];
      existing.push(evaluation);
      groups.set(key, existing);
    }

    return groups;
  }

  async getStudentResults(
    workspaceId: string,
    studentId: string,
    filters?: {
      phaseId?: string;
      templateId?: string;
    },
  ) {
    const phaseResultsRaw = await this.prisma.studentPhaseResult.findMany({
      where: {
        workspaceId,
        studentId,
        ...(filters?.phaseId ? { phaseId: filters.phaseId } : {}),
      },
      include: {
        phase: {
          select: {
            id: true,
            name: true,
            creditHours: true,
            isConfigurationPublished: true,
          },
        },
      },
      orderBy: { calculatedAt: 'desc' },
    });

    const evaluations =
      await this.prisma.submissionEvaluation.findMany({
        where: {
          workspaceId,
          studentScores: { some: { studentId } },
          ...(filters?.phaseId
            ? { deliverable: { phaseId: filters.phaseId } }
            : {}),
          ...(filters?.templateId ? { templateId: filters.templateId } : {}),
        },
        include: {
          deliverable: {
            select: {
              title: true,
              phase: { select: { id: true, name: true } },
            },
          },
          template: {
            select: {
              title: true,
              totalMarks: true,
              weightagePercent: true,
              rubricCriteria: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
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
        orderBy: { submittedAt: 'desc' },
      });

    const evaluatorIds = [
      ...new Set(evaluations.map((evaluation) => evaluation.evaluatorId)),
    ];
    const evaluatorNames = await this.loadEvaluatorNames(evaluatorIds);
    const groups = this.groupEvaluationsBySubmissionTemplate(evaluations);

    const deliverableResults = [...groups.entries()].map(([, group]) => {
      const first = group[0];
      const averaged = averageStudentDeliverableScores(
        group,
        studentId,
        evaluatorNames,
        first.template.rubricCriteria,
      );

      return {
        submissionId: first.submissionId,
        templateId: first.templateId,
        deliverableTitle: first.deliverable.title,
        phase: first.deliverable.phase,
        template: {
          title: first.template.title,
          totalMarks: first.template.totalMarks,
          weightagePercent: Number(first.template.weightagePercent),
          rubricCriteria: first.template.rubricCriteria,
        },
        submittedAt:
          group
            .filter((item) => item.submittedAt)
            .map((item) => item.submittedAt)
            .sort((a, b) => (b?.getTime() ?? 0) - (a?.getTime() ?? 0))[0]
            ?.toISOString() ?? null,
        averagedScore: averaged,
        evaluators: group.map((evaluation) => ({
          evaluationId: evaluation.id,
          evaluatorId: evaluation.evaluatorId,
          evaluatorName:
            evaluatorNames.get(evaluation.evaluatorId) ?? 'Evaluator',
          status: evaluation.status,
        })),
      };
    });

    const phaseResults = phaseResultsRaw.map((result) => ({
      ...result,
      gpa: result.isComplete ? result.gpa : null,
      gpaAvailable: result.isComplete,
      configurationPublished: result.phase.isConfigurationPublished,
      breakdown: Array.isArray(result.breakdown) ? result.breakdown : [],
    }));

    return {
      phaseResults,
      deliverableResults,
    };
  }

  async getSupervisorResults(
    workspaceId: string,
    supervisorId: string,
    filters?: {
      phaseId?: string;
      templateId?: string;
      teamId?: string;
    },
  ) {
    const teams = await this.prisma.team.findMany({
      where: {
        workspaceId,
        proposal: { assignedSupervisorId: supervisorId },
        ...(filters?.teamId ? { id: filters.teamId } : {}),
      },
      select: { id: true, name: true, projectTitle: true },
    });

    if (!teams.length) {
      return { teams: [], phaseResults: [], deliverableResults: [] };
    }

    const teamIds = teams.map((t) => t.id);
    const members = await this.prisma.teamMember.findMany({
      where: { teamId: { in: teamIds } },
      select: { teamId: true, authUserId: true },
    });

    const studentIds = members.map((m) => m.authUserId);
    const studentNames = await this.loadPersonNames(studentIds);

    const [phaseResultsRaw, evaluations] = await Promise.all([
      this.prisma.studentPhaseResult.findMany({
        where: {
          workspaceId,
          studentId: { in: studentIds },
          ...(filters?.phaseId ? { phaseId: filters.phaseId } : {}),
        },
        include: {
          phase: {
            select: {
              id: true,
              name: true,
              creditHours: true,
              isConfigurationPublished: true,
            },
          },
        },
      }),
      this.prisma.submissionEvaluation.findMany({
        where: {
          workspaceId,
          teamId: { in: teamIds },
          status: SubmissionEvaluationStatus.SUBMITTED,
          ...(filters?.phaseId
            ? { deliverable: { phaseId: filters.phaseId } }
            : {}),
          ...(filters?.templateId
            ? { templateId: filters.templateId }
            : {}),
        },
        include: {
          deliverable: {
            select: {
              title: true,
              phase: { select: { id: true, name: true } },
            },
          },
          template: {
            select: {
              title: true,
              totalMarks: true,
              weightagePercent: true,
              rubricCriteria: { orderBy: { sortOrder: 'asc' } },
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
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    const evaluatorIds = [
      ...new Set(evaluations.map((evaluation) => evaluation.evaluatorId)),
    ];
    const evaluatorNames = await this.loadEvaluatorNames(evaluatorIds);

    const deliverableResults = [...this.groupEvaluationsBySubmissionTemplate(evaluations).values()].flatMap(
      (group) => {
        const first = group[0];
        return studentIds
          .map((studentId) => {
            const averaged = averageStudentDeliverableScores(
              group,
              studentId,
              evaluatorNames,
              first.template.rubricCriteria,
            );
            if (!averaged) {
              return null;
            }

            return {
              submissionId: first.submissionId,
              teamId: first.teamId,
              studentId,
              studentName: studentNames.get(studentId) ?? 'Student',
              deliverableTitle: first.deliverable.title,
              phase: first.deliverable.phase,
              template: {
                title: first.template.title,
                totalMarks: first.template.totalMarks,
                weightagePercent: Number(first.template.weightagePercent),
              },
              averagedScore: averaged,
            };
          })
          .filter((row) => row !== null);
      },
    );

    const phaseResults = this.filterPhaseResultsByStudents(
      phaseResultsRaw,
      await this.resolveFilteredStudentIds(workspaceId, {
        teamId: filters?.teamId,
        templateId: filters?.templateId,
      }),
    ).map((result) => ({
      ...result,
      studentName: studentNames.get(result.studentId) ?? 'Student',
      gpa: result.isComplete ? result.gpa : null,
      gpaAvailable: result.isComplete,
      configurationPublished: result.phase.isConfigurationPublished,
    }));

    return {
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name || team.projectTitle || 'Team',
        members: members
          .filter((m) => m.teamId === team.id)
          .map((m) => ({
            studentId: m.authUserId,
            fullName: studentNames.get(m.authUserId) ?? 'Student',
          })),
      })),
      phaseResults,
      deliverableResults,
    };
  }

  async getCoordinatorResults(
    workspaceId: string,
    filters?: {
      phaseId?: string;
      templateId?: string;
      supervisorId?: string;
      teamId?: string;
      studentId?: string;
      evaluatorId?: string;
    },
  ) {
    const evaluations =
      await this.prisma.submissionEvaluation.findMany({
        where: {
          workspaceId,
          ...(filters?.phaseId
            ? { deliverable: { phaseId: filters.phaseId } }
            : {}),
          ...(filters?.templateId
            ? { templateId: filters.templateId }
            : {}),
          ...(filters?.supervisorId
            ? {
                deliverable: {
                  supervisorId: filters.supervisorId,
                },
              }
            : {}),
          ...(filters?.teamId ? { teamId: filters.teamId } : {}),
          ...(filters?.evaluatorId
            ? { evaluatorId: filters.evaluatorId }
            : {}),
          ...(filters?.studentId
            ? {
                studentScores: {
                  some: { studentId: filters.studentId },
                },
              }
            : {}),
        },
        include: {
          deliverable: {
            select: {
              title: true,
              supervisorId: true,
              phase: {
                select: {
                  id: true,
                  name: true,
                  creditHours: true,
                  isConfigurationPublished: true,
                },
              },
            },
          },
          template: {
            select: {
              title: true,
              totalMarks: true,
              weightagePercent: true,
              rubricCriteria: { orderBy: { sortOrder: 'asc' } },
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
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      });

    const phaseResultsRaw = await this.prisma.studentPhaseResult.findMany({
      where: {
        workspaceId,
        ...(filters?.phaseId ? { phaseId: filters.phaseId } : {}),
        ...(filters?.studentId ? { studentId: filters.studentId } : {}),
      },
      include: {
        phase: {
          select: {
            id: true,
            name: true,
            creditHours: true,
            isConfigurationPublished: true,
          },
        },
      },
      orderBy: { calculatedAt: 'desc' },
    });

    const teamIds = [...new Set(evaluations.map((e) => e.teamId))];
    const studentIds = [
      ...new Set(
        evaluations.flatMap((evaluation) =>
          evaluation.studentScores.map((score) => score.studentId),
        ),
      ),
      ...phaseResultsRaw.map((result) => result.studentId),
    ];
    const evaluatorIds = [
      ...new Set(evaluations.map((evaluation) => evaluation.evaluatorId)),
    ];
    const supervisorIds = [
      ...new Set(evaluations.map((e) => e.deliverable.supervisorId)),
    ];

    const [teams, studentNames, evaluatorNames, supervisorNames] =
      await Promise.all([
        teamIds.length
          ? this.prisma.team.findMany({
              where: { id: { in: teamIds } },
              select: { id: true, name: true, projectTitle: true },
            })
          : Promise.resolve([]),
        this.loadPersonNames(studentIds),
        this.loadEvaluatorNames(evaluatorIds),
        this.loadPersonNames(supervisorIds),
      ]);

    const teamById = new Map<string, string>(
      teams.map((t) => [
        t.id,
        t.name || t.projectTitle || 'Team',
      ] as const),
    );

    const deliverableResults = [...this.groupEvaluationsBySubmissionTemplate(evaluations).values()].flatMap(
      (group) => {
        const first = group[0];
        const studentIdsInGroup = [
          ...new Set(
            group.flatMap((evaluation) =>
              evaluation.studentScores.map((score) => score.studentId),
            ),
          ),
        ];

        return studentIdsInGroup.map((studentId) => ({
          submissionId: first.submissionId,
          teamId: first.teamId,
          teamName: teamById.get(first.teamId) ?? 'Team',
          studentId,
          studentName: studentNames.get(studentId) ?? 'Student',
          deliverableTitle: first.deliverable.title,
          phase: first.deliverable.phase,
          supervisorName:
            (first.deliverable.supervisorId &&
              supervisorNames.get(first.deliverable.supervisorId)) ??
            'Supervisor',
          template: {
            title: first.template.title,
            totalMarks: first.template.totalMarks,
            weightagePercent: Number(first.template.weightagePercent),
          },
          averagedScore: averageStudentDeliverableScores(
            group.filter(
              (item) => item.status === SubmissionEvaluationStatus.SUBMITTED,
            ),
            studentId,
            evaluatorNames,
            first.template.rubricCriteria,
          ),
          evaluators: group.map((evaluation) => ({
            evaluationId: evaluation.id,
            evaluatorId: evaluation.evaluatorId,
            evaluatorName:
              evaluatorNames.get(evaluation.evaluatorId) ?? 'Evaluator',
            status: evaluation.status,
          })),
        }));
      },
    );

    const phaseResults = this.filterPhaseResultsByStudents(
      phaseResultsRaw,
      await this.resolveFilteredStudentIds(workspaceId, {
        teamId: filters?.teamId,
        supervisorId: filters?.supervisorId,
        templateId: filters?.templateId,
        evaluatorId: filters?.evaluatorId,
        studentId: filters?.studentId,
      }),
    ).map((result) => ({
      ...result,
      studentName: studentNames.get(result.studentId) ?? 'Student',
      gpa: result.isComplete ? result.gpa : null,
      gpaAvailable: result.isComplete,
      configurationPublished: result.phase.isConfigurationPublished,
      breakdown: Array.isArray(result.breakdown) ? result.breakdown : [],
    }));

    return {
      deliverableResults,
      phaseResults,
    };
  }
}
