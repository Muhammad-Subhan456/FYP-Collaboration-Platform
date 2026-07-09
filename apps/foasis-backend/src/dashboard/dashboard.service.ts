import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { ProfilesService } from '../users/profiles.service';
import { ProposalsService } from '../proposals/proposals.service';
import { TeamsService } from '../teams/teams.service';
import { DeliverablesService } from '../progress/deliverables/deliverables.service';
import { EvaluationsService } from '../progress/evaluations/evaluations.service';
import { StatsService } from '../progress/stats/stats.service';
import { AnnouncementsService } from '../progress/announcements/announcements.service';
import { GlobalAnnouncementsService } from '../progress/global-announcements/global-announcements.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../progress/activity-logs/activity-logs.service';
import { StudentContextService } from '../student/student-context.service';

const EMPTY_STUDENT_STATS = {
  pendingSubmissions: 0,
  upcomingDeliverables: 0,
  openIssues: 0,
  assignedIssues: 0,
  recentlyCompletedIssues: 0,
  upcomingEvaluations: 0,
};

type DashboardRole = 'STUDENT' | 'SUPERVISOR' | 'COORDINATOR';

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
    private readonly announcementsService: AnnouncementsService,
    private readonly globalAnnouncementsService: GlobalAnnouncementsService,
    private readonly notificationsService: NotificationsService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly studentContextService: StudentContextService,
  ) {}

  async getDashboard(authUserId: string) {
    const [profile, ctx] = await Promise.all([
      this.profilesService.getMyProfile(authUserId),
      this.studentContextService.load(authUserId),
    ]);

    return {
      profile,
      team: ctx.team,
      proposal: ctx.proposal,
    };
  }

  async getCoordinatorDashboard(workspaceId: string) {
    const [
      userStats,
      totalTeams,
      proposalStats,
      progressStats,
    ] = await Promise.all([
      this.authService.getUserStats(workspaceId),
      this.teamsService.getTeamCountForCoordinator(workspaceId),
      this.proposalsService.getProposalStats(workspaceId),
      this.statsService.getCoordinatorStats(workspaceId),
    ]);

    return {
      users: userStats,
      totalTeams,
      proposals: proposalStats,
      progress: progressStats,
    };
  }

  async getSupervisorDashboard(supervisorId: string) {
    const [deliverables, requests, supervised] =
      await Promise.all([
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

    const supervisedTeams = supervised.length;

    const stats =
      await this.statsService.getSupervisorStats(
        supervisorId,
        supervisedTeams,
      );

    return {
      stats: {
        ...stats,
        supervisedTeams,
      },
      deliverables,
      pendingRequests: requests,
      supervisedTeams: supervised,
    };
  }

  async getStudentDashboard(authUserId: string) {
    const { team, proposal, teamId, supervisorId } =
      await this.studentContextService.load(authUserId);

    const [profile, stats, deliverables, evaluations] =
      await Promise.all([
        this.profilesService.getMyProfile(authUserId),
        teamId
          ? this.statsService
              .getStudentStats(
                teamId,
                authUserId,
                supervisorId,
              )
              .catch(() => EMPTY_STUDENT_STATS)
          : Promise.resolve(EMPTY_STUDENT_STATS),
        this.deliverablesService
          .getForMyTeamByUserId(
            authUserId,
            supervisorId,
          )
          .catch(() => []),
        teamId
          ? this.evaluationsService
              .getMyEvaluationsByUserId(
                authUserId,
                teamId,
              )
              .catch(() => [])
          : Promise.resolve([]),
      ]);

    return {
      profile,
      team,
      proposal,
      stats,
      deliverables,
      evaluations,
    };
  }

  async getStudentOverview(
    authUserId: string,
    workspaceId: string,
  ) {
    return {
      role: 'STUDENT' as const,
      ...(await this.buildStudentOverview(
        authUserId,
        workspaceId,
      )),
    };
  }

  async getOverview(
    authUserId: string,
    role: string,
    workspaceId: string,
  ) {
    switch (role as DashboardRole) {
      case 'STUDENT':
        return this.getStudentOverview(
          authUserId,
          workspaceId,
        );
      case 'SUPERVISOR':
        return this.getSupervisorOverview(
          authUserId,
          workspaceId,
        );
      case 'COORDINATOR':
        return this.getCoordinatorOverview(
          authUserId,
          workspaceId,
        );
      default:
        throw new ForbiddenException(
          'Dashboard overview is not available for this role',
        );
    }
  }

  private async getRecentActivity(authUserId: string) {
    const [notifications, activityLogs] =
      await Promise.all([
        this.notificationsService
          .getMyNotifications(authUserId, 1, 20)
          .catch(() => ({
            data: [],
            total: 0,
            page: 1,
            limit: 20,
          })),
        this.activityLogsService
          .getMyLogs(authUserId)
          .catch(() => []),
      ]);

    return { notifications, activityLogs };
  }

  private async buildStudentOverview(
    authUserId: string,
    workspaceId: string,
  ) {
    const { team, proposal, teamId, supervisorId } =
      await this.studentContextService.load(authUserId);

    const [
      globalAnnouncements,
      notifications,
      activityLogs,
      stats,
      deliverables,
      evaluations,
      teamMembers,
      announcements,
      supervisor,
    ] = await Promise.all([
      this.globalAnnouncementsService
        .getAnnouncements(workspaceId, 'STUDENT')
        .catch(() => []),
      this.notificationsService
        .getMyNotifications(authUserId, 1, 20)
        .catch(() => ({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
        })),
      this.activityLogsService
        .getMyLogs(authUserId)
        .catch(() => []),
      teamId
        ? this.statsService
            .getStudentStats(
              teamId,
              authUserId,
              supervisorId,
            )
            .catch(() => EMPTY_STUDENT_STATS)
        : Promise.resolve(EMPTY_STUDENT_STATS),
      this.deliverablesService
        .getForMyTeamByUserId(
          authUserId,
          supervisorId,
        )
        .catch(() => []),
      teamId
        ? this.evaluationsService
            .getMyEvaluationsByUserId(
              authUserId,
              teamId,
            )
            .catch(() => [])
        : Promise.resolve([]),
      teamId
        ? this.teamsService
            .getTeamMembers(teamId)
            .catch(() => [])
        : Promise.resolve([]),
      this.announcementsService
        .getForMyTeamByUserId(
          authUserId,
          supervisorId,
        )
        .catch(() => []),
      supervisorId
        ? this.profilesService
            .findOne(supervisorId)
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    return {
      team,
      proposal,
      stats,
      deliverables,
      evaluations,
      teamMembers,
      announcements,
      globalAnnouncements,
      supervisor,
      recentActivity: {
        notifications,
        activityLogs,
      },
    };
  }

  async getSupervisorOverview(
    supervisorId: string,
    workspaceId: string,
  ) {
    const [
      globalAnnouncements,
      notifications,
      activityLogs,
      deliverables,
      requests,
      supervised,
    ] = await Promise.all([
      this.globalAnnouncementsService
        .getAnnouncements(workspaceId, 'SUPERVISOR')
        .catch(() => []),
      this.notificationsService
        .getMyNotifications(supervisorId, 1, 20)
        .catch(() => ({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
        })),
      this.activityLogsService
        .getMyLogs(supervisorId)
        .catch(() => []),
      this.deliverablesService
        .getMyDeliverables(supervisorId)
        .catch(() => []),
      this.proposalsService
        .getSupervisorRequests(supervisorId)
        .catch(() => []),
      this.proposalsService
        .getSupervisedProposals(supervisorId)
        .catch(() => []),
    ]);

    const supervisedTeams = supervised.length;

    const stats =
      await this.statsService.getSupervisorStats(
        supervisorId,
        supervisedTeams,
      );

    return {
      role: 'SUPERVISOR' as const,
      stats: {
        ...stats,
        supervisedTeams,
      },
      deliverables,
      pendingRequests: requests,
      supervisedTeams: supervised,
      globalAnnouncements,
      recentActivity: {
        notifications,
        activityLogs,
      },
    };
  }

  async getCoordinatorOverview(
    authUserId: string,
    workspaceId: string,
  ) {
    const [
      globalAnnouncements,
      notifications,
      activityLogs,
      userStats,
      totalTeams,
      proposalStats,
      progressStats,
    ] = await Promise.all([
      this.globalAnnouncementsService
        .getAnnouncements(workspaceId, 'COORDINATOR', {
          coordinatorView: true,
        })
        .catch(() => []),
      this.notificationsService
        .getMyNotifications(authUserId, 1, 20)
        .catch(() => ({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
        })),
      this.activityLogsService
        .getMyLogs(authUserId)
        .catch(() => []),
      this.authService.getUserStats(workspaceId),
      this.teamsService.getTeamCountForCoordinator(workspaceId),
      this.proposalsService.getProposalStats(workspaceId),
      this.statsService.getCoordinatorStats(workspaceId),
    ]);

    return {
      role: 'COORDINATOR' as const,
      users: userStats,
      totalTeams,
      proposals: proposalStats,
      progress: progressStats,
      globalAnnouncements,
      recentActivity: {
        notifications,
        activityLogs,
      },
    };
  }
}
