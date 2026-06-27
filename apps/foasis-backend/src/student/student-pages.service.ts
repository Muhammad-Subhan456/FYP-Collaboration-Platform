import { Injectable } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AnnouncementsService } from '../progress/announcements/announcements.service';
import { DeliverablesService } from '../progress/deliverables/deliverables.service';
import { EvaluationResultsService } from '../progress/evaluation-results/evaluation-results.service';
import { EvaluationsService } from '../progress/evaluations/evaluations.service';
import { MeetingsService } from '../progress/meetings/meetings.service';
import { MilestonesService } from '../progress/milestones/milestones.service';
import { SubmissionsService } from '../progress/submissions/submissions.service';
import { TasksService } from '../progress/tasks/tasks.service';
import { ProposalsService } from '../proposals/proposals.service';
import { TeamsService } from '../teams/teams.service';
import { isTeamProfileComplete } from '../teams/team-profile.util';
import { ProfilesService } from '../users/profiles.service';

import { StudentContextService } from './student-context.service';

@Injectable()
export class StudentPagesService {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly studentContextService: StudentContextService,
    private readonly teamsService: TeamsService,
    private readonly profilesService: ProfilesService,
    private readonly deliverablesService: DeliverablesService,
    private readonly submissionsService: SubmissionsService,
    private readonly announcementsService: AnnouncementsService,
    private readonly meetingsService: MeetingsService,
    private readonly milestonesService: MilestonesService,
    private readonly tasksService: TasksService,
    private readonly evaluationsService: EvaluationsService,
    private readonly evaluationResultsService: EvaluationResultsService,
    private readonly proposalsService: ProposalsService,
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getDashboard(authUserId: string) {
    return this.dashboardService.getStudentOverview(authUserId);
  }

  getTeam(authUserId: string) {
    return this.teamsService.getStudentTeamOverview(authUserId);
  }

  async getDeliverables(authUserId: string) {
    const ctx =
      await this.studentContextService.load(authUserId);

    const deliverables = ctx.teamId
      ? await this.deliverablesService
          .getForMyTeamByUserId(
            authUserId,
            ctx.supervisorId,
          )
          .catch(() => [])
      : [];

    return { team: ctx.team, deliverables };
  }

  async getSubmissions(authUserId: string) {
    const ctx =
      await this.studentContextService.load(authUserId);

    if (!ctx.teamId) {
      return {
        team: null,
        deliverables: [],
        submissions: {
          data: [],
          total: 0,
          page: 1,
          limit: 50,
        },
        submissionHistories: {},
      };
    }

    const [deliverables, submissions, submissionHistories] =
      await Promise.all([
        this.deliverablesService
          .getForMyTeamByUserId(
            authUserId,
            ctx.supervisorId,
          )
          .catch(() => []),
        this.submissionsService
          .getMySubmissionsByUserId(
            authUserId,
            1,
            50,
            ctx.team,
          )
          .catch(() => ({
            data: [],
            total: 0,
            page: 1,
            limit: 50,
          })),
        this.submissionsService
          .getSubmissionHistoriesByTeamId(ctx.teamId)
          .catch(() => ({})),
      ]);

    return {
      team: ctx.team,
      deliverables,
      submissions,
      submissionHistories,
    };
  }

  async getAnnouncements(authUserId: string) {
    const ctx =
      await this.studentContextService.load(authUserId);

    const announcements = ctx.teamId
      ? await this.announcementsService
          .getForMyTeamByUserId(
            authUserId,
            ctx.supervisorId,
          )
          .catch(() => [])
      : [];

    return { team: ctx.team, announcements };
  }

  async getMeetings(authUserId: string) {
    const ctx =
      await this.studentContextService.load(authUserId);

    const meetings = ctx.teamId
      ? await this.meetingsService
          .getForMyTeamByUserId(
            authUserId,
            ctx.supervisorId,
          )
          .catch(() => [])
      : [];

    const supervisorIds = [
      ...new Set(
        meetings
          .map((meeting) => meeting.supervisorId)
          .filter(Boolean),
      ),
    ];

    const profiles =
      supervisorIds.length > 0
        ? await this.profilesService
            .findManyByAuthUserIds(supervisorIds)
            .catch(() => ({}))
        : {};

    return { team: ctx.team, meetings, profiles };
  }

  async getMilestones(authUserId: string) {
    const ctx =
      await this.studentContextService.load(authUserId);

    const milestones =
      ctx.proposal?.id
        ? await this.milestonesService
            .getMilestonesWithTasks(
              ctx.proposal.id,
              authUserId,
              'STUDENT',
            )
            .catch(() => [])
        : [];

    return {
      team: ctx.team,
      proposal: ctx.proposal,
      milestones,
    };
  }

  async getTasks(authUserId: string) {
    const ctx =
      await this.studentContextService.load(authUserId);

    const tasks = ctx.teamId
      ? await this.tasksService
          .getMyTasks(authUserId)
          .catch(() => [])
      : [];

    return { team: ctx.team, tasks };
  }

  async getEvaluations(authUserId: string) {
    const ctx =
      await this.studentContextService.load(authUserId);

    const evaluations = ctx.teamId
      ? await this.evaluationsService
          .getMyEvaluationsByUserId(
            authUserId,
            ctx.teamId,
          )
          .catch(() => [])
      : [];

    return { team: ctx.team, evaluations };
  }

  async getResults(authUserId: string) {
    const ctx =
      await this.studentContextService.load(authUserId);

    const results = ctx.teamId
      ? await this.evaluationResultsService
          .getMyResultsByUserId(
            authUserId,
            ctx.teamId,
          )
          .catch(() => [])
      : [];

    return { team: ctx.team, results };
  }

  getNotifications(
    authUserId: string,
    page = 1,
    limit = 20,
  ) {
    return this.notificationsService.getMyNotifications(
      authUserId,
      page,
      limit,
    );
  }

  async getProfile(authUserId: string) {
    const profile =
      await this.profilesService.getMyProfile(authUserId);

    return profile;
  }

  async getProposal(authUserId: string) {
    const ctx =
      await this.studentContextService.load(authUserId);

    if (!ctx.teamId || !ctx.team) {
      return {
        team: null,
        proposal: null,
        invitations: [],
        supervisors: [],
        requestHistory: [],
        activePendingRequest: null,
        isWorkflowLocked: false,
        isProfileComplete: false,
        profiles: {},
      };
    }

    const isProfileComplete = isTeamProfileComplete(ctx.team);
    const isWorkflowLocked =
      await this.teamsService.isTeamWorkflowLocked(ctx.teamId);

    await this.proposalsService
      .expirePendingSupervisorRequests()
      .catch(() => undefined);

    const invitations = await this.proposalsService
      .getTeamInvitationsByUserId(authUserId)
      .catch(() => []);

    const canBrowseSupervisors =
      isProfileComplete &&
      !isWorkflowLocked &&
      !ctx.proposal?.assignedSupervisorId &&
      ctx.proposal?.status !== 'REJECTED' &&
      ctx.proposal?.status !== 'PENDING_SUPERVISOR';

    const supervisors = canBrowseSupervisors
      ? await this.authService
          .listSupervisorsForBrowsing()
          .catch(() => [])
      : [];

    const requestHistory = ctx.proposal
      ? await this.proposalsService
          .getRequestHistoryForProposal(ctx.proposal.id)
          .catch(() => [])
      : [];

    const activePendingRequest =
      requestHistory.find((request) => request.status === 'PENDING') ??
      null;

    const profileIds = [
      ...(ctx.proposal?.assignedSupervisorId
        ? [ctx.proposal.assignedSupervisorId]
        : []),
      ...invitations.map(
        (invitation) => invitation.supervisorId,
      ),
      ...requestHistory.map((request) => request.supervisorId),
      ...supervisors.map((supervisor) => supervisor.id),
    ];

    const profiles =
      profileIds.length > 0
        ? await this.profilesService
            .findManyByAuthUserIds([...new Set(profileIds)])
            .catch(() => ({}))
        : {};

    return {
      team: ctx.team,
      proposal: ctx.proposal,
      invitations,
      supervisors,
      requestHistory,
      activePendingRequest,
      isWorkflowLocked,
      isProfileComplete,
      profiles,
    };
  }
}
