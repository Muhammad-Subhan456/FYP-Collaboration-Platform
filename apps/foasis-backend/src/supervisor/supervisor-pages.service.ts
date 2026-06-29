import { Injectable } from '@nestjs/common';

import { DashboardService } from '../dashboard/dashboard.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AnnouncementsService } from '../progress/announcements/announcements.service';
import { DeliverablesService } from '../progress/deliverables/deliverables.service';
import { EvaluationPanelsService } from '../progress/evaluation-panels/evaluation-panels.service';
import { EvaluationResultsService } from '../progress/evaluation-results/evaluation-results.service';
import { TeamIssuesService } from '../progress/team-issues/team-issues.service';
import { SubmissionsService } from '../progress/submissions/submissions.service';
import { WorkStreamService } from '../progress/work-stream/work-stream.service';
import { ProposalsService } from '../proposals/proposals.service';
import { TeamsService } from '../teams/teams.service';
import { ProfilesService } from '../users/profiles.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupervisorPagesService {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly deliverablesService: DeliverablesService,
    private readonly announcementsService: AnnouncementsService,
    private readonly proposalsService: ProposalsService,
    private readonly submissionsService: SubmissionsService,
    private readonly teamIssuesService: TeamIssuesService,
    private readonly evaluationPanelsService: EvaluationPanelsService,
    private readonly evaluationResultsService: EvaluationResultsService,
    private readonly teamsService: TeamsService,
    private readonly profilesService: ProfilesService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly workStreamService: WorkStreamService,
  ) {}

  getDashboard(supervisorId: string) {
    return this.dashboardService.getSupervisorOverview(
      supervisorId,
    );
  }

  getDeliverables(supervisorId: string) {
    return this.deliverablesService.getMyDeliverables(
      supervisorId,
    );
  }

  getWorkStream(
    supervisorId: string,
    teamId?: string,
  ) {
    return this.workStreamService.getSupervisorWorkStream(
      supervisorId,
      teamId,
    );
  }

  getAnnouncements(supervisorId: string) {
    return this.announcementsService.getMyAnnouncements(
      supervisorId,
    );
  }

  getNotifications(
    supervisorId: string,
    page = 1,
    limit = 20,
  ) {
    return this.notificationsService.getMyNotifications(
      supervisorId,
      page,
      limit,
    );
  }

  getProfile(supervisorId: string) {
    return this.profilesService.getMyProfile(supervisorId);
  }

  async getRequests(supervisorId: string) {
    const proposals =
      await this.proposalsService.getSupervisorRequests(
        supervisorId,
      );

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

  async getInvitations(supervisorId: string) {
    const [browseTargets, invitations, atCapacity] =
      await Promise.all([
        this.proposalsService.getInvitationBrowseTargets(
          supervisorId,
        ),
        this.proposalsService.getSupervisorInvitations(
          supervisorId,
        ),
        this.proposalsService.isSupervisorAtCapacity(
          supervisorId,
        ),
      ]);

    const profileIds = [
      ...browseTargets.map(
        (target) => target.teamLeaderAuthUserId,
      ),
      ...invitations.map(
        (i) => i.proposal?.teamLeaderAuthUserId,
      ),
    ].filter((id): id is string => !!id);

    const profiles =
      profileIds.length > 0
        ? await this.profilesService
            .findManyByAuthUserIds([...new Set(profileIds)])
            .catch(() => ({}))
        : {};

    return {
      browseTargets,
      invitations,
      profiles,
      atCapacity,
    };
  }

  async getTeams(supervisorId: string) {
    const proposals =
      await this.proposalsService.getSupervisedProposals(
        supervisorId,
      );

    const teamIds = [
      ...new Set(proposals.map((p) => p.teamId)),
    ];

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
      ...proposals.map((p) => p.teamLeaderAuthUserId),
      ...Object.values(membersByTeamId)
        .flat()
        .map((m: { authUserId: string }) => m.authUserId),
    ].filter((id): id is string => !!id);

    const profiles =
      profileIds.length > 0
        ? await this.profilesService
            .findManyByAuthUserIds([...new Set(profileIds)])
            .catch(() => ({}))
        : {};

    return { proposals, membersByTeamId, profiles };
  }

  async getReviews(
    supervisorId: string,
    deliverableId?: string,
  ) {
    const [deliverables, supervisedProposals] =
      await Promise.all([
        this.deliverablesService.getMyDeliverables(
          supervisorId,
        ),
        this.proposalsService.getSupervisedProposals(
          supervisorId,
        ),
      ]);

    const resolvedDeliverableId =
      deliverableId ?? deliverables[0]?.id ?? null;

    const submissions = resolvedDeliverableId
      ? await this.submissionsService
          .getDeliverableSubmissions(
            resolvedDeliverableId,
            supervisorId,
          )
          .catch(() => [])
      : [];

    return {
      deliverables,
      supervisedProposals,
      selectedDeliverableId: resolvedDeliverableId,
      submissions,
    };
  }

  async getMilestones(supervisorId: string, teamId?: string) {
    const proposals =
      await this.proposalsService.getSupervisedProposals(
        supervisorId,
      );

    const teams = [
      ...new Map(
        proposals.map((proposal) => [
          proposal.teamId,
          {
            id: proposal.teamId,
            name: proposal.title,
          },
        ]),
      ).values(),
    ];

    const supervisedTeamIds = teams.map((team) => team.id);
    let resolvedTeamId = teamId ?? supervisedTeamIds[0];

    if (
      resolvedTeamId &&
      !supervisedTeamIds.includes(resolvedTeamId)
    ) {
      resolvedTeamId = supervisedTeamIds[0];
    }

    const [issues, members] = await Promise.all([
      resolvedTeamId
        ? this.teamIssuesService
            .getIssuesForTeam(resolvedTeamId)
            .catch(() => [])
        : Promise.resolve([]),
      resolvedTeamId
        ? this.teamsService
            .getTeamMembers(resolvedTeamId)
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    const summaries = this.teamIssuesService.buildSummaries(issues);

    const profileIds = [
      ...issues.map((issue) => issue.createdById),
      ...issues
        .map((issue) => issue.assignedToId)
        .filter((id): id is string => !!id),
      ...issues.flatMap((issue) =>
        issue.comments.map((comment) => comment.authUserId),
      ),
      ...issues.flatMap((issue) =>
        issue.activities.map((activity) => activity.actorId),
      ),
      ...members.map((member) => member.authUserId),
    ];

    const profiles =
      profileIds.length > 0
        ? await this.profilesService
            .findManyByAuthUserIds([...new Set(profileIds)])
            .catch(() => ({}))
        : {};

    return {
      teams,
      selectedTeamId: resolvedTeamId ?? null,
      issues,
      profiles,
      summaries,
    };
  }

  async getEvaluations(supervisorId: string) {
    const panels =
      await this.evaluationPanelsService.getMyPanels(
        supervisorId,
      );

    const teamIds = [
      ...new Set(
        panels.flatMap(
          (panel) =>
            panel.assignments?.map((a) => a.teamId) ?? [],
        ),
      ),
    ];

    const [teamNameById, results] = await Promise.all([
      this.loadTeamNameMap(teamIds),
      this.evaluationResultsService.getResultsByTeamIds(
        teamIds,
      ),
    ]);

    return { panels, teamNameById, results };
  }

  private async loadMembersByTeamIds(teamIds: string[]) {
    const membersByTeamId: Record<string, unknown[]> =
      {};

    if (!teamIds.length) {
      return membersByTeamId;
    }

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

    return membersByTeamId;
  }

  private async loadTeamNameMap(teamIds: string[]) {
    if (!teamIds.length) {
      return {};
    }

    const teams = await this.prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    });

    return Object.fromEntries(
      teams.map((team) => [team.id, team.name]),
    );
  }
}
