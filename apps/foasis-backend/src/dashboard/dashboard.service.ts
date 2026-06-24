import { Injectable } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { ProfilesService } from '../users/profiles.service';
import { ProposalsService } from '../proposals/proposals.service';
import { TeamsService } from '../teams/teams.service';
import { DeliverablesService } from '../progress/deliverables/deliverables.service';
import { EvaluationsService } from '../progress/evaluations/evaluations.service';
import { StatsService } from '../progress/stats/stats.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly teamsService: TeamsService,
    private readonly proposalsService: ProposalsService,
    private readonly authService: AuthService,
    private readonly statsService: StatsService,
    private readonly deliverablesService: DeliverablesService,
    private readonly evaluationsService: EvaluationsService,
  ) {}

  async getDashboard(authUserId: string) {
    const [profile, team] = await Promise.all([
      this.profilesService.getMyProfile(authUserId),
      this.teamsService.getMyTeam(authUserId),
    ]);

    const proposal =
      await this.proposalsService.getMyProposalByUserId(
        authUserId,
      );

    return {
      profile,
      team,
      proposal,
    };
  }

  async getCoordinatorDashboard() {
    const [
      userStats,
      teams,
      proposalStats,
      progressStats,
    ] = await Promise.all([
      this.authService.getUserStats(),
      this.teamsService.getAllTeamsForCoordinator(),
      this.proposalsService.getProposalStats(),
      this.statsService.getCoordinatorStats(),
    ]);

    return {
      users: userStats,
      totalTeams: teams.length,
      proposals: proposalStats,
      progress: progressStats,
    };
  }

  async getSupervisorDashboard(supervisorId: string) {
    const [stats, deliverables, requests, supervised] =
      await Promise.all([
        this.statsService.getSupervisorStats(supervisorId),
        this.deliverablesService.getMyDeliverables(
          supervisorId,
        ),
        this.proposalsService.getSupervisorRequests(
          supervisorId,
        ),
        this.proposalsService.getSupervisedProposals(
          supervisorId,
        ),
      ]);

    const supervisedTeams = Array.isArray(supervised)
      ? supervised.length
      : 0;

    return {
      stats: {
        ...stats,
        supervisedTeams:
          supervisedTeams || stats?.supervisedTeams || 0,
      },
      deliverables,
      pendingRequests: requests,
      supervisedTeams: supervised,
    };
  }

  async getStudentDashboard(authUserId: string) {
    const emptyStats = {
      pendingSubmissions: 0,
      upcomingDeliverables: 0,
      openTasks: 0,
      upcomingEvaluations: 0,
    };

    const profile =
      await this.profilesService.getMyProfile(authUserId);

    const team = await this.teamsService
      .getMyTeam(authUserId)
      .catch(() => null);

    const proposal =
      await this.proposalsService
        .getMyProposalByUserId(authUserId)
        .catch(() => null);

    let stats = emptyStats;
    let deliverables: unknown[] = [];
    let evaluations: unknown[] = [];

    if (team?.id) {
      const supervisorId =
        proposal?.assignedSupervisorId ?? null;

      [stats, deliverables, evaluations] = await Promise.all([
        this.statsService
          .getStudentStats(
            team.id,
            authUserId,
            supervisorId,
          )
          .catch(() => emptyStats),
        this.deliverablesService
          .getForMyTeamByUserId(authUserId)
          .catch(() => []),
        this.evaluationsService
          .getMyEvaluationsByUserId(authUserId)
          .catch(() => []),
      ]);
    }

    return {
      profile,
      team,
      proposal,
      stats,
      deliverables,
      evaluations,
    };
  }
}
