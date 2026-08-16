import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReminderStatus } from '@prisma/client';

import { AppUrlsService } from '../common/app-urls.service';
import { AuthService } from '../auth/auth.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { EmailService } from '../email/email.service';
import { buildProposalSupervisorReminderEmail } from '../email/email.templates';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { EvaluationsService } from '../progress/evaluations/evaluations.service';
import { EvaluationResultsService } from '../progress/evaluation-results/evaluation-results.service';
import { GlobalAnnouncementsService } from '../progress/global-announcements/global-announcements.service';
import { ActivityLogsService } from '../progress/activity-logs/activity-logs.service';
import { ReminderTypes } from '../progress/reminders/reminder.types';
import { ProposalsService } from '../proposals/proposals.service';
import { TeamsService } from '../teams/teams.service';
import { ProfilesService } from '../users/profiles.service';
import { PrismaService } from '../prisma/prisma.service';

import { SendProposalSupervisorReminderDto } from './dto/send-proposal-supervisor-reminder.dto';

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
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly profilesService: ProfilesService,
    private readonly emailService: EmailService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly appUrls: AppUrlsService,
    private readonly prisma: PrismaService,
  ) {}

  getDashboard(coordinatorId: string, workspaceId: string) {
    return this.dashboardService.getCoordinatorOverview(
      coordinatorId,
      workspaceId,
    );
  }

  getAnalytics(workspaceId: string) {
    return this.buildCoordinatorAnalytics(workspaceId);
  }

  private async buildCoordinatorAnalytics(workspaceId: string) {
    const [
      users,
      totalTeams,
      proposalGroups,
      submissionGroups,
      evaluationGroups,
      phaseGroups,
      templateTotal,
      templateLocked,
      activeDeliverables,
      publishedPhaseResults,
      proposalContent,
    ] = await Promise.all([
      this.authService.getUserStats(workspaceId),
      this.teamsService.getTeamCountForCoordinator(workspaceId),
      this.prisma.proposal.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { _all: true },
      }),
      this.prisma.submission.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { _all: true },
      }),
      this.prisma.submissionEvaluation.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { _all: true },
      }),
      this.prisma.phase.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { _all: true },
      }),
      this.prisma.deliverableTemplate.count({ where: { workspaceId } }),
      this.prisma.deliverableTemplate.count({
        where: { workspaceId, isLocked: true },
      }),
      this.prisma.deliverable.count({
        where: { workspaceId, isActive: true },
      }),
      this.prisma.studentPhaseResult.count({
        where: { workspaceId },
      }),
      this.prisma.proposal.findMany({
        where: { workspaceId },
        select: { domains: true, otherDomain: true, sdgs: true },
      }),
    ]);

    const toMap = <T extends string>(
      rows: Array<{ status: T; _count: { _all: number } }>,
    ) =>
      Object.fromEntries(
        rows.map((row) => [row.status, row._count._all]),
      ) as Partial<Record<T, number>>;

    const proposalsByStatus = toMap(proposalGroups);
    const submissionsByStatus = toMap(submissionGroups);
    const evaluationsByStatus = toMap(evaluationGroups);
    const phasesByStatus = toMap(phaseGroups);

    const pendingEvaluations =
      (evaluationsByStatus.ASSIGNED ?? 0) +
      (evaluationsByStatus.IN_PROGRESS ?? 0);

    const proposalInsights = this.buildProposalInsights(proposalContent);

    return {
      summary: {
        totalTeams,
        activePhases: phasesByStatus.ACTIVE ?? 0,
        deliverableTemplates: templateTotal,
        lockedTemplates: templateLocked,
        activeDeliverables,
        pendingEvaluations,
        finalizedSubmissions: submissionsByStatus.FINALIZED ?? 0,
        publishedPhaseResults,
      },
      users,
      proposalsByStatus: {
        DRAFT: proposalsByStatus.DRAFT ?? 0,
        PENDING_SUPERVISOR: proposalsByStatus.PENDING_SUPERVISOR ?? 0,
        SUPERVISOR_ASSIGNED: proposalsByStatus.SUPERVISOR_ASSIGNED ?? 0,
        APPROVED: proposalsByStatus.APPROVED ?? 0,
        REJECTED: proposalsByStatus.REJECTED ?? 0,
        IGNORED: proposalsByStatus.IGNORED ?? 0,
      },
      submissionsByStatus: {
        SUBMITTED: submissionsByStatus.SUBMITTED ?? 0,
        CHANGES_REQUIRED: submissionsByStatus.CHANGES_REQUIRED ?? 0,
        APPROVED: submissionsByStatus.APPROVED ?? 0,
        FINALIZED: submissionsByStatus.FINALIZED ?? 0,
      },
      evaluationsByStatus: {
        ASSIGNED: evaluationsByStatus.ASSIGNED ?? 0,
        IN_PROGRESS: evaluationsByStatus.IN_PROGRESS ?? 0,
        SUBMITTED: evaluationsByStatus.SUBMITTED ?? 0,
      },
      phasesByStatus: {
        ACTIVE: phasesByStatus.ACTIVE ?? 0,
        INACTIVE: phasesByStatus.INACTIVE ?? 0,
        PUBLISHED: phasesByStatus.PUBLISHED ?? 0,
      },
      templates: {
        total: templateTotal,
        locked: templateLocked,
        unlocked: Math.max(0, templateTotal - templateLocked),
      },
      proposalInsights,
    };
  }

  private buildProposalInsights(
    proposals: Array<{
      domains: string[];
      otherDomain: string | null;
      sdgs: number[];
    }>,
  ) {
    const domainCounts = new Map<string, number>();
    const sdgCounts = new Map<number, number>();
    const crossCounts = new Map<string, number>();

    let otherCount = 0;
    let projectsWithDomains = 0;
    let multiDomainProjects = 0;
    let singleDomainProjects = 0;
    let totalDomainSelections = 0;

    let projectsWithSdgs = 0;
    let totalSdgSelections = 0;

    for (const proposal of proposals) {
      const domains = proposal.domains ?? [];
      const hasOther = Boolean(proposal.otherDomain?.trim());
      const effectiveDomainCount = domains.length + (hasOther ? 1 : 0);

      if (effectiveDomainCount > 0) {
        projectsWithDomains += 1;
        totalDomainSelections += effectiveDomainCount;
        if (effectiveDomainCount > 1) {
          multiDomainProjects += 1;
        } else {
          singleDomainProjects += 1;
        }
      }
      for (const domain of domains) {
        domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
      }
      if (hasOther) {
        otherCount += 1;
      }

      const sdgs = proposal.sdgs ?? [];
      if (sdgs.length > 0) {
        projectsWithSdgs += 1;
        totalSdgSelections += sdgs.length;
      }
      for (const sdg of sdgs) {
        sdgCounts.set(sdg, (sdgCounts.get(sdg) ?? 0) + 1);
      }

      for (const domain of domains) {
        for (const sdg of sdgs) {
          const key = `${domain}||${sdg}`;
          crossCounts.set(key, (crossCounts.get(key) ?? 0) + 1);
        }
      }
    }

    const perDomain = [...domainCounts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);

    const perSdg = [...sdgCounts.entries()]
      .map(([sdg, count]) => ({ sdg, count }))
      .sort((a, b) => b.count - a.count);

    const crossAnalysis = [...crossCounts.entries()]
      .map(([key, count]) => {
        const [domain, sdg] = key.split('||');
        return { domain, sdg: Number(sdg), count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const round2 = (value: number) => Math.round(value * 100) / 100;

    return {
      totalProposals: proposals.length,
      domains: {
        perDomain,
        otherCount,
        projectsWithDomains,
        multiDomainProjects,
        singleDomainProjects,
        avgDomainsPerProject: projectsWithDomains
          ? round2(totalDomainSelections / projectsWithDomains)
          : 0,
        mostPopular: perDomain[0]?.domain ?? null,
      },
      sdgs: {
        perSdg,
        projectsWithSdgs,
        avgSdgsPerProject: projectsWithSdgs
          ? round2(totalSdgSelections / projectsWithSdgs)
          : 0,
        mostSelected: perSdg[0]?.sdg ?? null,
      },
      crossAnalysis,
    };
  }

  getUsers(workspaceId: string) {
    return this.enrichUsers(workspaceId);
  }

  private async enrichUsers(workspaceId: string) {
    const users = await this.authService.listAllUsers(workspaceId);

    const supervisorIds = users
      .filter((user) => user.role === 'SUPERVISOR')
      .map((user) => user.id);
    const studentIds = users
      .filter((user) => user.role === 'STUDENT')
      .map((user) => user.id);

    const supervisedCounts =
      supervisorIds.length > 0
        ? await this.prisma.proposal.groupBy({
            by: ['assignedSupervisorId'],
            where: {
              workspaceId,
              assignedSupervisorId: { in: supervisorIds },
              status: {
                in: ['APPROVED', 'SUPERVISOR_ASSIGNED'],
              },
            },
            _count: { _all: true },
          })
        : [];

    const teamMemberships =
      studentIds.length > 0
        ? await this.prisma.teamMember.findMany({
            where: {
              authUserId: { in: studentIds },
              team: { workspaceId },
            },
            select: { authUserId: true },
            distinct: ['authUserId'],
          })
        : [];

    const supervisedCountById = new Map<string, number>(
      supervisedCounts.map((row) => [
        row.assignedSupervisorId as string,
        row._count._all,
      ]),
    );
    const studentsWithTeam = new Set(
      teamMemberships.map((row) => row.authUserId),
    );

    return users.map((user) => {
      if (user.role === 'SUPERVISOR') {
        return {
          ...user,
          supervisedTeamCount: supervisedCountById.get(user.id) ?? 0,
        };
      }

      if (user.role === 'STUDENT') {
        return {
          ...user,
          hasTeam: studentsWithTeam.has(user.id),
        };
      }

      return user;
    });
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

    const proposals =
      teamIds.length > 0
        ? await this.prisma.proposal.findMany({
            where: {
              workspaceId,
              teamId: { in: teamIds },
            },
            select: {
              teamId: true,
              assignedSupervisorId: true,
            },
          })
        : [];

    const supervisorByTeamId = new Map(
      proposals.map((proposal) => [
        proposal.teamId,
        proposal.assignedSupervisorId ?? null,
      ] as const),
    );

    const enrichedTeams = teams.map((team) => ({
      ...team,
      assignedSupervisorId: supervisorByTeamId.get(team.id) ?? null,
    }));

    const profileIds = [
      ...teams.map((team) => team.leaderId),
      ...Object.values(membersByTeamId)
        .flat()
        .map((m: { authUserId: string }) => m.authUserId),
      ...enrichedTeams
        .map((team) => team.assignedSupervisorId)
        .filter((id): id is string => !!id),
    ];

    const profiles =
      profileIds.length > 0
        ? await this.profilesService
            .findManyByAuthUserIds([...new Set(profileIds)])
            .catch(() => ({}))
        : {};

    return { teams: enrichedTeams, membersByTeamId, profiles };
  }

  async getProposals(workspaceId: string) {
    const proposals =
      await this.proposalsService.getAllProposalsForCoordinator();

    const profileIds = [
      ...new Set(
        proposals.flatMap((p) =>
          [p.teamLeaderAuthUserId, p.assignedSupervisorId].filter(
            (id): id is string => !!id,
          ),
        ),
      ),
    ];

    const proposalIds = proposals.map((p) => p.id);

    const [profiles, reminderRows, teams] = await Promise.all([
      profileIds.length > 0
        ? this.profilesService
            .findManyByAuthUserIds(profileIds)
            .catch(() => ({} as Record<string, never>))
        : Promise.resolve({} as Record<string, never>),
      proposalIds.length > 0
        ? this.prisma.scheduledReminder.findMany({
            where: {
              workspaceId,
              reminderType: ReminderTypes.PROPOSAL_SUPERVISOR_SELECTION,
              entityType: 'PROPOSAL',
              entityId: { in: proposalIds },
              status: ReminderStatus.SENT,
            },
            select: {
              entityId: true,
              sentAt: true,
            },
            orderBy: { sentAt: 'desc' },
          })
        : Promise.resolve([]),
      proposalIds.length > 0
        ? this.prisma.team.findMany({
            where: {
              id: { in: [...new Set(proposals.map((p) => p.teamId))] },
            },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const lastReminderByProposalId = new Map<string, Date>();
    for (const reminder of reminderRows) {
      if (
        reminder.entityId &&
        reminder.sentAt &&
        !lastReminderByProposalId.has(reminder.entityId)
      ) {
        lastReminderByProposalId.set(reminder.entityId, reminder.sentAt);
      }
    }

    const teamNameById = new Map<string, string>(
      teams.map((team) => [team.id, team.name] as const),
    );

    return {
      proposals: proposals.map((proposal) => ({
        ...proposal,
        teamName: teamNameById.get(proposal.teamId) ?? null,
        lastReminderSentAt:
          lastReminderByProposalId.get(proposal.id)?.toISOString() ?? null,
      })),
      profiles,
    };
  }

  async sendProposalSupervisorReminder(
    workspaceId: string,
    coordinatorId: string,
    dto: SendProposalSupervisorReminderDto,
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: dto.proposalId },
      select: {
        id: true,
        title: true,
        teamId: true,
        workspaceId: true,
        assignedSupervisorId: true,
        status: true,
      },
    });

    if (!proposal || proposal.workspaceId !== workspaceId) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.assignedSupervisorId) {
      throw new BadRequestException(
        'A supervisor is already assigned for this proposal',
      );
    }

    const deadline = new Date(dto.deadline);
    if (Number.isNaN(deadline.getTime())) {
      throw new BadRequestException('Invalid deadline');
    }

    const [team, members] = await Promise.all([
      this.prisma.team.findUnique({
        where: { id: proposal.teamId },
        select: { id: true, name: true },
      }),
      this.prisma.teamMember.findMany({
        where: { teamId: proposal.teamId },
        select: { authUserId: true },
      }),
    ]);

    if (members.length === 0) {
      throw new BadRequestException(
        'This proposal has no team members to remind',
      );
    }

    const memberIds = members.map((member) => member.authUserId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, email: true },
    });

    const proposalTitle = proposal.title?.trim() || 'Untitled proposal';
    const teamName = team?.name ?? undefined;
    const actionUrl = this.appUrls.portalUrl('/student/proposal');
    const deadlineLabel = deadline.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const title = 'Supervisor selection reminder';
    const message = `Please select a supervisor for "${proposalTitle}" before ${deadlineLabel}. No supervisor has been selected or assigned yet.`;

    await Promise.allSettled(
      memberIds.map((authUserId) =>
        this.notificationDispatch.send({
          authUserId,
          title,
          message,
          type: 'PROPOSAL_SUPERVISOR_REMINDER',
          entityType: 'PROPOSAL',
          entityId: proposal.id,
          route: '/student/proposal',
        }),
      ),
    );

    const sentAt = new Date();
    await Promise.allSettled(
      users
        .filter((user) => Boolean(user.email))
        .map((user) =>
          this.emailService.send({
            ...buildProposalSupervisorReminderEmail({
              to: user.email,
              proposalTitle,
              deadline,
              teamName,
              actionUrl,
            }),
            idempotencyKey: `proposal_supervisor_reminder:${proposal.id}:${user.id}:${sentAt.toISOString()}`,
          }),
        ),
    );

    await this.prisma.scheduledReminder.create({
      data: {
        workspaceId,
        reminderType: ReminderTypes.PROPOSAL_SUPERVISOR_SELECTION,
        entityType: 'PROPOSAL',
        entityId: proposal.id,
        title,
        message,
        route: '/student/proposal',
        channels: ['notification', 'email'],
        audienceSpec: {
          roles: ['STUDENT'],
          userIds: memberIds,
        },
        scheduledFor: sentAt,
        status: ReminderStatus.SENT,
        sentAt,
        metadata: {
          proposalId: proposal.id,
          proposalTitle,
          deadline: deadline.toISOString(),
          teamId: proposal.teamId,
          teamName: teamName ?? null,
          recipientCount: memberIds.length,
          sentByCoordinatorId: coordinatorId,
        },
      },
    });

    await this.activityLogsService.logActivity(
      coordinatorId,
      'Proposal Supervisor Reminder Sent',
      `${proposalTitle} → ${memberIds.length} student(s)`,
    );

    return {
      success: true,
      lastReminderSentAt: sentAt.toISOString(),
      recipientCount: memberIds.length,
    };
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
}
