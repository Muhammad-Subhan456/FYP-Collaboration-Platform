import { Injectable } from '@nestjs/common';

import { DashboardService } from '../dashboard/dashboard.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AnnouncementsService } from '../progress/announcements/announcements.service';
import { DeliverablesService } from '../progress/deliverables/deliverables.service';
import { EvaluationPanelsService } from '../progress/evaluation-panels/evaluation-panels.service';
import { EvaluationResultsService } from '../progress/evaluation-results/evaluation-results.service';
import { MeetingsService } from '../progress/meetings/meetings.service';
import { MilestonesService } from '../progress/milestones/milestones.service';
import { ProposalsService } from '../proposals/proposals.service';
import { SubmissionsService } from '../progress/submissions/submissions.service';
import { TeamsService } from '../teams/teams.service';
import { ProfilesService } from '../users/profiles.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupervisorPagesService {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly deliverablesService: DeliverablesService,
    private readonly meetingsService: MeetingsService,
    private readonly announcementsService: AnnouncementsService,
    private readonly proposalsService: ProposalsService,
    private readonly submissionsService: SubmissionsService,
    private readonly milestonesService: MilestonesService,
    private readonly evaluationPanelsService: EvaluationPanelsService,
    private readonly evaluationResultsService: EvaluationResultsService,
    private readonly teamsService: TeamsService,
    private readonly profilesService: ProfilesService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
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

  getMeetings(supervisorId: string) {
    return this.meetingsService.getMyMeetings(supervisorId);
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
    const requests =
      await this.proposalsService.getSupervisorRequests(
        supervisorId,
      );

    const profileIds = requests
      .map((r) => r.proposal?.teamLeaderAuthUserId)
      .filter((id): id is string => !!id);

    const profiles =
      profileIds.length > 0
        ? await this.profilesService
            .findManyByAuthUserIds([...new Set(profileIds)])
            .catch(() => ({}))
        : {};

    return { requests, profiles };
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

  async getMilestones(supervisorId: string) {
    const proposals =
      await this.proposalsService.getSupervisedProposals(
        supervisorId,
      );

    const teamIds = [
      ...new Set(proposals.map((p) => p.teamId)),
    ];

    const [membersByTeamId, milestonesEntries] =
      await Promise.all([
        this.loadMembersByTeamIds(teamIds),
        Promise.all(
          proposals.map(async (proposal) => {
            const milestones =
              await this.milestonesService
                .getMilestonesWithTasks(
                  proposal.id,
                  supervisorId,
                  'SUPERVISOR',
                )
                .catch(() => []);

            return [proposal.id, milestones] as const;
          }),
        ),
      ]);

    const milestonesByProposalId = Object.fromEntries(
      milestonesEntries,
    );

    const memberIds = Object.values(membersByTeamId)
      .flat()
      .map((m: { authUserId: string }) => m.authUserId);

    const profiles =
      memberIds.length > 0
        ? await this.profilesService
            .findManyByAuthUserIds([...new Set(memberIds)])
            .catch(() => ({}))
        : {};

    return {
      proposals,
      membersByTeamId,
      milestonesByProposalId,
      profiles,
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
