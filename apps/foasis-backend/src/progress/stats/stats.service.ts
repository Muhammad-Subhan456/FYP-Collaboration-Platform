import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async getSupervisedTeamCount(
    supervisorId: string,
  ): Promise<number> {
    return this.prisma.proposal.count({
      where: {
        assignedSupervisorId: supervisorId,
        status: {
          in: ['SUPERVISOR_ASSIGNED', 'APPROVED'],
        },
      },
    });
  }

  async getSupervisorStats(
    supervisorId: string,
    supervisedTeamCount?: number,
  ) {
    const [activeDeliverables, pendingReviews, supervisedTeams] =
      await Promise.all([
        this.prisma.deliverable.count({
          where: { supervisorId, isActive: true },
        }),

        this.prisma.submission.count({
          where: {
            status: 'SUBMITTED',
            deliverable: { supervisorId },
          },
        }),

        supervisedTeamCount !== undefined
          ? Promise.resolve(supervisedTeamCount)
          : this.getSupervisedTeamCount(supervisorId),
      ]);

    return {
      activeDeliverables,
      pendingReviews,
      supervisedTeams,
    };
  }

  async getCoordinatorStats() {
    const now = new Date();

    const [
      pendingSubmissions,
      upcomingEvaluations,
      totalDeliverables,
      publishedResults,
    ] = await Promise.all([
      this.prisma.submission.count({
        where: { status: 'SUBMITTED' },
      }),

      this.prisma.evaluation.count({
        where: { date: { gte: now } },
      }),

      this.prisma.deliverable.count({
        where: { isActive: true },
      }),

      this.prisma.evaluationResult.count(),
    ]);

    return {
      pendingSubmissions,
      upcomingEvaluations,
      totalDeliverables,
      publishedResults,
    };
  }

  async getStudentStats(
    teamId: string,
    authUserId: string,
    supervisorId: string | null,
  ) {
    const now = new Date();

    const [
      pendingSubmissions,
      upcomingDeliverables,
      openTasks,
      upcomingEvaluations,
    ] = await Promise.all([
      this.prisma.submission.count({
        where: {
          teamId,
          status: { in: ['SUBMITTED', 'CHANGES_REQUIRED'] },
        },
      }),

      supervisorId
        ? this.prisma.deliverable.count({
            where: {
              supervisorId,
              isActive: true,
              dueDate: { gte: now },
            },
          })
        : Promise.resolve(0),

      this.prisma.task.count({
        where: {
          assignedTo: authUserId,
          status: { not: 'DONE' },
        },
      }),

      this.prisma.evaluationAssignment.count({
        where: {
          teamId,
          evaluation: { date: { gte: now } },
        },
      }),
    ]);

    return {
      pendingSubmissions,
      upcomingDeliverables,
      openTasks,
      upcomingEvaluations,
    };
  }
}
