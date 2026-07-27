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
    const supervisedTeamIds = await this.prisma.proposal.findMany({
      where: {
        assignedSupervisorId: supervisorId,
        status: { in: ['SUPERVISOR_ASSIGNED', 'APPROVED'] },
      },
      select: { teamId: true },
    });

    const teamIds = [
      ...new Set(supervisedTeamIds.map((p) => p.teamId)),
    ];

    const weekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    );

    const [
      activeDeliverables,
      pendingReviews,
      supervisedTeams,
      openIssues,
      inProgressIssues,
      recentlyCompletedIssues,
    ] = await Promise.all([
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

      teamIds.length
        ? this.prisma.teamIssue.count({
            where: {
              teamId: { in: teamIds },
              status: 'OPEN',
            },
          })
        : Promise.resolve(0),

      teamIds.length
        ? this.prisma.teamIssue.count({
            where: {
              teamId: { in: teamIds },
              status: 'IN_PROGRESS',
            },
          })
        : Promise.resolve(0),

      teamIds.length
        ? this.prisma.teamIssue.count({
            where: {
              teamId: { in: teamIds },
              status: 'COMPLETED',
              completedAt: { gte: weekAgo },
            },
          })
        : Promise.resolve(0),
    ]);

    return {
      activeDeliverables,
      pendingReviews,
      supervisedTeams,
      openIssues,
      inProgressIssues,
      recentlyCompletedIssues,
    };
  }

  async getCoordinatorStats(workspaceId: string) {
    const now = new Date();

    const [
      pendingSubmissions,
      upcomingEvaluations,
      totalDeliverables,
      publishedResults,
    ] = await Promise.all([
      this.prisma.submission.count({
        where: { workspaceId, status: 'SUBMITTED' },
      }),

      this.prisma.evaluation.count({
        where: { workspaceId, date: { gte: now } },
      }),

      this.prisma.deliverable.count({
        where: { workspaceId, isActive: true },
      }),

      this.prisma.evaluationResult.count({
        where: { evaluation: { workspaceId } },
      }),
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
      issueSummaries,
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

      this.prisma.teamIssue.count({
        where: {
          teamId,
          status: 'OPEN',
        },
      }).then(async (open) => {
        const [assignedToMe, recentlyCompleted] =
          await Promise.all([
            this.prisma.teamIssue.count({
              where: {
                teamId,
                assignedToId: authUserId,
                status: 'IN_PROGRESS',
              },
            }),
            this.prisma.teamIssue.count({
              where: {
                teamId,
                status: 'COMPLETED',
                completedAt: {
                  gte: new Date(
                    Date.now() - 7 * 24 * 60 * 60 * 1000,
                  ),
                },
              },
            }),
          ]);

        return { open, assignedToMe, recentlyCompleted };
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
      openIssues: issueSummaries.open,
      assignedIssues: issueSummaries.assignedToMe,
      recentlyCompletedIssues: issueSummaries.recentlyCompleted,
      upcomingEvaluations,
    };
  }
}
