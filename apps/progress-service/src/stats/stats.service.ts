import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  private internalHeaders() {
    return {
      'X-Internal-Api-Key':
        process.env.INTERNAL_API_KEY,
    };
  }

  private async getSupervisedTeamCount(
    supervisorId: string,
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${process.env.PROPOSAL_SERVICE_URL}/proposals/supervised/${supervisorId}`,
          { headers: this.internalHeaders() },
        ),
      );

      return Array.isArray(response.data)
        ? response.data.length
        : 0;
    } catch {
      return 0;
    }
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

  async getSupervisorStats(supervisorId: string) {
    const now = new Date();

    const [
      activeDeliverables,
      pendingReviews,
      upcomingMeetings,
      supervisedTeams,
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

      this.prisma.meeting.count({
        where: {
          supervisorId,
          meetingDate: { gte: now },
        },
      }),

      this.getSupervisedTeamCount(supervisorId),
    ]);

    return {
      activeDeliverables,
      pendingReviews,
      upcomingMeetings,
      supervisedTeams,
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
