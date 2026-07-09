import { Injectable } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EvaluationsService } from '../progress/evaluations/evaluations.service';
import { EvaluationResultsService } from '../progress/evaluation-results/evaluation-results.service';
import { GlobalAnnouncementsService } from '../progress/global-announcements/global-announcements.service';
import { ProposalsService } from '../proposals/proposals.service';
import { TeamsService } from '../teams/teams.service';
import { ProfilesService } from '../users/profiles.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoordinatorPagesService {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly authService: AuthService,
    private readonly teamsService: TeamsService,
    private readonly proposalsService: ProposalsService,
    private readonly evaluationsService: EvaluationsService,
    private readonly evaluationResultsService: EvaluationResultsService,
    private readonly globalAnnouncementsService: GlobalAnnouncementsService,
    private readonly notificationsService: NotificationsService,
    private readonly profilesService: ProfilesService,
    private readonly prisma: PrismaService,
  ) {}

  getDashboard(coordinatorId: string, workspaceId: string) {
    return this.dashboardService.getCoordinatorOverview(
      coordinatorId,
      workspaceId,
    );
  }

  getAnalytics(workspaceId: string) {
    return this.dashboardService.getCoordinatorDashboard(
      workspaceId,
    );
  }

  getUsers(workspaceId: string) {
    return this.authService.listAllUsers(workspaceId);
  }

  async getTeams(workspaceId: string) {
    const teams =
      await this.teamsService.getAllTeamsForCoordinator(
        workspaceId,
      );

    const teamIds = teams.map((team) => team.id);
    const membersByTeamId: Record<string, unknown[]> =
      {};

    if (teamIds.length > 0) {
      const members =
        await this.prisma.teamMember.findMany({
          where: { teamId: { in: teamIds } },
        });

      for (const member of members) {
        if (!membersByTeamId[member.teamId]) {
          membersByTeamId[member.teamId] = [];
        }
        membersByTeamId[member.teamId].push(member);
      }
    }

    const profileIds = [
      ...teams.map((team) => team.leaderId),
      ...Object.values(membersByTeamId)
        .flat()
        .map((m: { authUserId: string }) => m.authUserId),
    ];

    const profiles =
      profileIds.length > 0
        ? await this.profilesService
            .findManyByAuthUserIds([...new Set(profileIds)])
            .catch(() => ({}))
        : {};

    return { teams, membersByTeamId, profiles };
  }

  async getProposals() {
    const proposals =
      await this.proposalsService.getAllProposalsForCoordinator();

    const profileIds = proposals
      .map((p) => p.teamLeaderAuthUserId)
      .filter((id): id is string => !!id);

    const profiles =
      profileIds.length > 0
        ? await this.profilesService
            .findManyByAuthUserIds([...new Set(profileIds)])
            .catch(() => ({}))
        : {};

    return { proposals, profiles };
  }

  async getEvaluations(workspaceId: string) {
    const [evaluations, teams, supervisors] =
      await Promise.all([
        this.evaluationsService.getAllEvaluations(workspaceId),
        this.teamsService.getAllTeamsForCoordinator(workspaceId),
        this.authService.listSupervisors(workspaceId),
      ]);

    const evaluationIds = evaluations.map((e) => e.id);

    const [panels, assignments] =
      evaluationIds.length > 0
        ? await Promise.all([
            this.prisma.evaluationPanel.findMany({
              where: {
                evaluationId: { in: evaluationIds },
              },
              include: {
                evaluators: true,
                assignments: true,
                evaluation: true,
              },
              orderBy: { scheduledAt: 'asc' },
            }),
            this.prisma.evaluationAssignment.findMany({
              where: {
                evaluationId: { in: evaluationIds },
              },
            }),
          ])
        : [[], []];

    const panelsByEvaluationId: Record<string, typeof panels> =
      {};
    const assignmentsByEvaluationId: Record<
      string,
      typeof assignments
    > = {};

    for (const panel of panels) {
      if (!panelsByEvaluationId[panel.evaluationId]) {
        panelsByEvaluationId[panel.evaluationId] = [];
      }
      panelsByEvaluationId[panel.evaluationId].push(panel);
    }

    for (const assignment of assignments) {
      if (
        !assignmentsByEvaluationId[assignment.evaluationId]
      ) {
        assignmentsByEvaluationId[assignment.evaluationId] =
          [];
      }
      assignmentsByEvaluationId[
        assignment.evaluationId
      ].push(assignment);
    }

    return {
      evaluations,
      teams,
      supervisors,
      panelsByEvaluationId,
      assignmentsByEvaluationId,
    };
  }

  async getResults(workspaceId: string) {
    const [teams, overview] = await Promise.all([
      this.teamsService.getAllTeamsForCoordinator(workspaceId),
      this.evaluationResultsService.getCoordinatorOverview(workspaceId),
    ]);

    return { teams, overview };
  }

  getAnnouncements(workspaceId: string) {
    return this.globalAnnouncementsService.getAnnouncements(
      workspaceId,
      'COORDINATOR',
      { coordinatorView: true },
    );
  }

  getNotifications(
    coordinatorId: string,
    page = 1,
    limit = 20,
    isRead?: boolean,
  ) {
    return this.notificationsService.getMyNotifications(
      coordinatorId,
      page,
      limit,
      isRead,
    );
  }

  getProfile(coordinatorId: string) {
    return this.profilesService.getMyProfile(coordinatorId);
  }

  async getSystemHealth() {
    const timestamp = new Date().toISOString();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        service: 'foasis-backend',
        database: 'connected',
        services: [
          {
            name: 'foasis-backend',
            status: 'ok',
            database: 'connected',
            timestamp,
          },
        ],
        timestamp,
      };
    } catch {
      return {
        status: 'error',
        service: 'foasis-backend',
        database: 'disconnected',
        services: [
          {
            name: 'foasis-backend',
            status: 'error',
            database: 'disconnected',
            timestamp,
          },
        ],
        timestamp,
      };
    }
  }
}
