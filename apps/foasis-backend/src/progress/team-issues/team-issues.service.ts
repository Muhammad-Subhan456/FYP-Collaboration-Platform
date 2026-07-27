import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TeamIssueActivityType,
  TeamIssueStatus,
  type TeamIssue,
  type TeamIssueComment,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ProposalsService } from '../../proposals/proposals.service';
import { ProfilesService } from '../../users/profiles.service';
import { DomainEvents } from '../../domain-events/domain-event.constants';
import { DomainEventService } from '../../domain-events/domain-event.service';
import type {
  IssueCommentCreatedPayload,
  IssueSnapshotPayload,
} from '../../domain-events/domain-event.types';
import { TeamAccessService } from '../common/team-access.service';

import { CompleteTeamIssueDto } from './dto/complete-team-issue.dto';
import { CreateTeamIssueCommentDto } from './dto/create-team-issue-comment.dto';
import { CreateTeamIssueDto } from './dto/create-team-issue.dto';
import { UpdateTeamIssueDto } from './dto/update-team-issue.dto';
import { parseGithubLinks } from './helpers/github-url';
import {
  serializeActivity,
  serializeComment,
  serializeIssueSnapshot,
} from './team-issues-realtime';

const ISSUE_LIST_COMMENT_TAKE = 20;
const ISSUE_LIST_ACTIVITY_TAKE = 10;

/** Full history for single-issue reload / realtime snapshots. */
const ISSUE_INCLUDE = {
  comments: { orderBy: { createdAt: 'asc' as const } },
  activities: { orderBy: { createdAt: 'desc' as const } },
};

/** Capped nested rows for board/list endpoints. */
const ISSUE_LIST_INCLUDE = {
  comments: {
    orderBy: { createdAt: 'asc' as const },
    take: ISSUE_LIST_COMMENT_TAKE,
  },
  activities: {
    orderBy: { createdAt: 'desc' as const },
    take: ISSUE_LIST_ACTIVITY_TAKE,
  },
};

@Injectable()
export class TeamIssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamAccessService: TeamAccessService,
    private readonly proposalsService: ProposalsService,
    private readonly profilesService: ProfilesService,
    private readonly domainEventService: DomainEventService,
  ) {}

  private async actorName(actorId: string) {
    const profile = await this.profilesService
      .findOne(actorId)
      .catch(() => null);

    return profile?.fullName ?? 'A team member';
  }

  private async logActivity(
    issueId: string,
    teamId: string,
    actorId: string,
    type: TeamIssueActivityType,
    description: string,
  ) {
    const issue = await this.prisma.teamIssue.findFirst({
      where: { id: issueId },
      select: { workspaceId: true },
    });
    if (!issue) {
      throw new BadRequestException('Issue not found');
    }

    return this.prisma.teamIssueActivity.create({
      data: {
        workspaceId: issue.workspaceId,
        issueId,
        teamId,
        actorId,
        type,
        description,
      },
    });
  }

  private async reloadIssue(issueId: string) {
    return this.prisma.teamIssue.findUniqueOrThrow({
      where: { id: issueId },
      include: ISSUE_INCLUDE,
    });
  }

  private publishIssueSnapshot(
    eventName: string,
    actorId: string,
    issue: Awaited<ReturnType<TeamIssuesService['reloadIssue']>>,
  ) {
    const payload: IssueSnapshotPayload = {
      issue: serializeIssueSnapshot(issue),
    };

    this.domainEventService.emitSafe<IssueSnapshotPayload>({
      name: eventName,
      timestamp: new Date().toISOString(),
      actorId,
      scope: { type: 'team', id: issue.teamId },
      entity: { type: 'TEAM_ISSUE', id: issue.id },
      payload,
    });
  }

  private publishIssueComment(
    actorId: string,
    issueId: string,
    teamId: string,
    comment: TeamIssueComment,
    activity: Awaited<ReturnType<TeamIssuesService['logActivity']>>,
    authorName?: string,
  ) {
    const payload: IssueCommentCreatedPayload = {
      issueId,
      teamId,
      comment: serializeComment(comment, { authorName }),
      activity: serializeActivity(activity),
    };

    this.domainEventService.emitSafe<IssueCommentCreatedPayload>({
      name: DomainEvents.ISSUE_COMMENT_CREATED,
      timestamp: comment.createdAt.toISOString(),
      actorId,
      scope: { type: 'team', id: teamId },
      entity: { type: 'TEAM_ISSUE', id: issueId },
      payload,
    });
  }

  private scheduleTeamNotifications(
    teamId: string,
    actorId: string,
    context: {
      title: string;
      message: string;
      type: string;
      entityId: string;
      studentRoute?: string;
      supervisorRoute?: string;
    },
  ) {
    void (async () => {
      try {
        await this.teamAccessService.notifyTeamMembers(
          teamId,
          {
            title: context.title,
            message: context.message,
            type: context.type,
            entityType: 'TEAM_ISSUE',
            entityId: context.entityId,
            route: context.studentRoute ?? '/student/milestones',
          },
          { excludeAuthUserId: actorId },
        );

        await this.teamAccessService.notifyAssignedSupervisor(
          teamId,
          {
            title: context.title,
            message: context.message,
            type: context.type,
            entityType: 'TEAM_ISSUE',
            entityId: context.entityId,
            route:
              context.supervisorRoute ?? '/supervisor/milestones',
          },
        );
      } catch {
        // Non-blocking background delivery
      }
    })();
  }

  private async notifyTeamAndSupervisor(
    teamId: string,
    context: {
      title: string;
      message: string;
      type: string;
      entityId: string;
      studentRoute?: string;
      supervisorRoute?: string;
    },
    actorId?: string,
  ) {
    if (actorId) {
      this.scheduleTeamNotifications(teamId, actorId, context);
      return;
    }

    await this.teamAccessService.notifyTeamMembers(teamId, {
      title: context.title,
      message: context.message,
      type: context.type,
      entityType: 'TEAM_ISSUE',
      entityId: context.entityId,
      route: context.studentRoute ?? '/student/milestones',
    });

    await this.teamAccessService.notifyAssignedSupervisor(teamId, {
      title: context.title,
      message: context.message,
      type: context.type,
      entityType: 'TEAM_ISSUE',
      entityId: context.entityId,
      route: context.supervisorRoute ?? '/supervisor/milestones',
    });
  }

  private async getIssueForCommentAccess(
    issueId: string,
    authUserId: string,
    role: string,
  ) {
    const issue = await this.prisma.teamIssue.findUnique({
      where: { id: issueId },
      select: { id: true, teamId: true, title: true, workspaceId: true },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    if (role === 'STUDENT') {
      const membership =
        await this.prisma.teamMember.findFirst({
          where: {
            authUserId,
            teamId: issue.teamId,
          },
          select: { teamId: true },
        });

      if (!membership) {
        throw new ForbiddenException(
          'You are not a member of this team',
        );
      }
    } else if (role === 'SUPERVISOR') {
      await this.assertSupervisorTeamAccess(
        authUserId,
        issue.teamId,
      );
    } else {
      throw new ForbiddenException('Invalid role');
    }

    return issue;
  }

  private async assertTeamMember(teamId: string, authUserId: string) {
    const team =
      await this.teamAccessService.getMyTeamByUserId(authUserId);

    if (!team?.id || team.id !== teamId) {
      throw new ForbiddenException(
        'You are not a member of this team',
      );
    }

    return team;
  }

  private async assertSupervisorTeamAccess(
    supervisorId: string,
    teamId: string,
  ) {
    const proposals =
      await this.proposalsService.getSupervisedProposals(
        supervisorId,
      );

    const teamIds = proposals.map((p) => p.teamId);

    if (!teamIds.includes(teamId)) {
      throw new ForbiddenException(
        'You do not supervise this team',
      );
    }
  }

  async assertIssueAccess(
    issueId: string,
    authUserId: string,
    role: string,
  ) {
    const issue = await this.prisma.teamIssue.findUnique({
      where: { id: issueId },
      include: ISSUE_INCLUDE,
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    if (role === 'STUDENT') {
      await this.assertTeamMember(issue.teamId, authUserId);
    } else if (role === 'SUPERVISOR') {
      await this.assertSupervisorTeamAccess(
        authUserId,
        issue.teamId,
      );
    } else {
      throw new ForbiddenException('Invalid role');
    }

    return issue;
  }

  private async getIssueOrThrow(issueId: string) {
    const issue = await this.prisma.teamIssue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    return issue;
  }

  async getIssuesForTeam(teamId: string) {
    return this.prisma.teamIssue.findMany({
      where: { teamId },
      include: ISSUE_LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getIssuesForTeamIds(teamIds: string[]) {
    if (!teamIds.length) {
      return [];
    }

    return this.prisma.teamIssue.findMany({
      where: { teamId: { in: teamIds } },
      include: ISSUE_LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  buildSummaries(
    issues: TeamIssue[],
    authUserId?: string,
  ) {
    const open = issues.filter(
      (i) => i.status === 'OPEN',
    ).length;
    const inProgress = issues.filter(
      (i) => i.status === 'IN_PROGRESS',
    ).length;
    const recentlyCompleted = issues.filter((i) => {
      if (i.status !== 'COMPLETED' || !i.completedAt) {
        return false;
      }
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return i.completedAt.getTime() >= weekAgo;
    }).length;
    const assignedToMe = authUserId
      ? issues.filter(
          (i) =>
            i.assignedToId === authUserId &&
            i.status === 'IN_PROGRESS',
        ).length
      : 0;

    return {
      open,
      inProgress,
      recentlyCompleted,
      assignedToMe,
    };
  }

  async createIssue(
    authUserId: string,
    dto: CreateTeamIssueDto,
  ) {
    const team =
      await this.teamAccessService.getMyTeamByUserId(
        authUserId,
      );

    if (!team?.id) {
      throw new ForbiddenException(
        'Join a team before creating issues',
      );
    }

    const issue = await this.prisma.teamIssue.create({
      data: {
        workspaceId: team.workspaceId,
        teamId: team.id,
        title: dto.title.trim(),
        description: dto.description.trim(),
        priority: dto.priority ?? 'MEDIUM',
        labels: dto.labels ?? [],
        createdById: authUserId,
      },
      include: ISSUE_INCLUDE,
    });

    const name = await this.actorName(authUserId);
    await this.logActivity(
      issue.id,
      team.id,
      authUserId,
      'CREATED',
      `${name} created the issue`,
    );

    await this.notifyTeamAndSupervisor(team.id, {
      title: 'New team issue',
      message: `${name} created "${issue.title}".`,
      type: 'TEAM_ISSUE_CREATED',
      entityId: issue.id,
    });

    const snapshot = await this.reloadIssue(issue.id);
    this.publishIssueSnapshot(
      DomainEvents.ISSUE_CREATED,
      authUserId,
      snapshot,
    );

    return snapshot;
  }

  async updateIssue(
    issueId: string,
    authUserId: string,
    dto: UpdateTeamIssueDto,
  ) {
    const issue = await this.getIssueOrThrow(issueId);
    await this.assertTeamMember(issue.teamId, authUserId);

    if (issue.createdById !== authUserId) {
      throw new ForbiddenException(
        'You can only edit issues you created',
      );
    }

    if (issue.status === 'COMPLETED') {
      throw new BadRequestException(
        'Completed issues cannot be edited',
      );
    }

    const nextTitle = dto.title?.trim();
    const nextDescription = dto.description?.trim();
    const nextPriority = dto.priority;
    const nextLabels = dto.labels;

    const hasChanges =
      (nextTitle !== undefined && nextTitle !== issue.title) ||
      (nextDescription !== undefined &&
        nextDescription !== issue.description) ||
      (nextPriority !== undefined && nextPriority !== issue.priority) ||
      (nextLabels !== undefined &&
        JSON.stringify(nextLabels) !== JSON.stringify(issue.labels));

    if (!hasChanges) {
      return this.reloadIssue(issue.id);
    }

    await this.prisma.teamIssue.update({
      where: { id: issueId },
      data: {
        ...(nextTitle !== undefined ? { title: nextTitle } : {}),
        ...(nextDescription !== undefined
          ? { description: nextDescription }
          : {}),
        ...(nextPriority !== undefined ? { priority: nextPriority } : {}),
        ...(nextLabels !== undefined ? { labels: nextLabels } : {}),
      },
    });

    const name = await this.actorName(authUserId);
    await this.logActivity(
      issue.id,
      issue.teamId,
      authUserId,
      'UPDATED',
      `${name} updated the issue`,
    );

    const snapshot = await this.reloadIssue(issue.id);
    this.publishIssueSnapshot(
      DomainEvents.ISSUE_UPDATED,
      authUserId,
      snapshot,
    );

    return snapshot;
  }

  async claimIssue(issueId: string, authUserId: string) {
    const issue = await this.getIssueOrThrow(issueId);
    await this.assertTeamMember(issue.teamId, authUserId);

    if (issue.status !== 'OPEN') {
      throw new BadRequestException(
        'Only open issues can be claimed',
      );
    }

    if (issue.assignedToId) {
      throw new BadRequestException(
        'This issue is already assigned',
      );
    }

    await this.prisma.teamIssue.update({
      where: { id: issueId },
      data: {
        status: 'IN_PROGRESS',
        assignedToId: authUserId,
      },
    });

    const name = await this.actorName(authUserId);
    await this.logActivity(
      issue.id,
      issue.teamId,
      authUserId,
      'CLAIMED',
      `${name} started working`,
    );

    await this.notifyTeamAndSupervisor(issue.teamId, {
      title: 'Issue claimed',
      message: `${name} is working on "${issue.title}".`,
      type: 'TEAM_ISSUE_CLAIMED',
      entityId: issue.id,
    });

    const snapshot = await this.reloadIssue(issue.id);
    this.publishIssueSnapshot(
      DomainEvents.ISSUE_CLAIMED,
      authUserId,
      snapshot,
    );

    return snapshot;
  }

  async releaseIssue(issueId: string, authUserId: string) {
    const issue = await this.getIssueOrThrow(issueId);
    await this.assertTeamMember(issue.teamId, authUserId);

    if (issue.assignedToId !== authUserId) {
      throw new ForbiddenException(
        'Only the assigned member can release this issue',
      );
    }

    if (issue.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Only in-progress issues can be released',
      );
    }

    await this.prisma.teamIssue.update({
      where: { id: issueId },
      data: {
        status: 'OPEN',
        assignedToId: null,
      },
    });

    const name = await this.actorName(authUserId);
    await this.logActivity(
      issue.id,
      issue.teamId,
      authUserId,
      'RELEASED',
      `${name} released the issue`,
    );

    await this.notifyTeamAndSupervisor(issue.teamId, {
      title: 'Issue released',
      message: `${name} released "${issue.title}".`,
      type: 'TEAM_ISSUE_RELEASED',
      entityId: issue.id,
    });

    const snapshot = await this.reloadIssue(issue.id);
    this.publishIssueSnapshot(
      DomainEvents.ISSUE_RELEASED,
      authUserId,
      snapshot,
    );

    return snapshot;
  }

  async completeIssue(
    issueId: string,
    authUserId: string,
    dto: CompleteTeamIssueDto,
  ) {
    const issue = await this.getIssueOrThrow(issueId);
    await this.assertTeamMember(issue.teamId, authUserId);

    if (issue.assignedToId !== authUserId) {
      throw new ForbiddenException(
        'Only the assigned member can complete this issue',
      );
    }

    if (issue.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Only in-progress issues can be completed',
      );
    }

    const evidence = parseGithubLinks(
      dto.githubPrUrl,
      dto.githubCommitUrl,
    );

    await this.prisma.teamIssue.update({
      where: { id: issueId },
      data: {
        status: 'COMPLETED',
        githubPrUrl: evidence.githubPrUrl,
        githubCommitUrl: evidence.githubCommitUrl,
        completedAt: new Date(),
      },
    });

    const name = await this.actorName(authUserId);
    await this.logActivity(
      issue.id,
      issue.teamId,
      authUserId,
      'COMPLETED',
      `${name} completed the issue`,
    );

    await this.notifyTeamAndSupervisor(issue.teamId, {
      title: 'Issue completed',
      message: `${name} completed "${issue.title}".`,
      type: 'TEAM_ISSUE_COMPLETED',
      entityId: issue.id,
    });

    const snapshot = await this.reloadIssue(issue.id);
    this.publishIssueSnapshot(
      DomainEvents.ISSUE_COMPLETED,
      authUserId,
      snapshot,
    );

    return snapshot;
  }

  async createComment(
    issueId: string,
    authUserId: string,
    role: string,
    dto: CreateTeamIssueCommentDto,
  ) {
    if (!dto.body?.trim()) {
      throw new BadRequestException('Comment cannot be empty');
    }

    const issue = await this.getIssueForCommentAccess(
      issueId,
      authUserId,
      role,
    );

    const [comment, name] = await Promise.all([
      this.prisma.teamIssueComment.create({
        data: {
          workspaceId: issue.workspaceId,
          issueId,
          teamId: issue.teamId,
          authUserId,
          body: dto.body.trim(),
        },
      }),
      this.actorName(authUserId),
    ]);

    const activityLabel =
      role === 'SUPERVISOR'
        ? 'Supervisor commented'
        : `${name} commented`;

    const activity = await this.logActivity(
      issueId,
      issue.teamId,
      authUserId,
      'COMMENTED',
      activityLabel,
    );

    this.publishIssueComment(
      authUserId,
      issueId,
      issue.teamId,
      comment,
      activity,
      name,
    );

    this.notifyTeamAndSupervisor(
      issue.teamId,
      {
        title: 'New issue comment',
        message: `${name} commented on "${issue.title}".`,
        type: 'TEAM_ISSUE_COMMENTED',
        entityId: issue.id,
      },
      authUserId,
    );

    return { ...comment, authorName: name };
  }

  async getIssue(
    issueId: string,
    authUserId: string,
    role: string,
  ) {
    return this.assertIssueAccess(issueId, authUserId, role);
  }

  async getIssuesForUser(authUserId: string) {
    return this.prisma.teamIssue.findMany({
      where: { assignedToId: authUserId },
      include: ISSUE_LIST_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async countOpenIssuesForStudent(
    teamId: string,
    authUserId: string,
  ) {
    const [open, assignedToMe, recentlyCompleted] =
      await Promise.all([
        this.prisma.teamIssue.count({
          where: { teamId, status: 'OPEN' },
        }),
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
  }

  async countSupervisorIssueSummaries(teamIds: string[]) {
    if (!teamIds.length) {
      return {
        open: 0,
        inProgress: 0,
        recentlyCompleted: 0,
      };
    }

    const [open, inProgress, recentlyCompleted] =
      await Promise.all([
        this.prisma.teamIssue.count({
          where: {
            teamId: { in: teamIds },
            status: 'OPEN',
          },
        }),
        this.prisma.teamIssue.count({
          where: {
            teamId: { in: teamIds },
            status: 'IN_PROGRESS',
          },
        }),
        this.prisma.teamIssue.count({
          where: {
            teamId: { in: teamIds },
            status: 'COMPLETED',
            completedAt: {
              gte: new Date(
                Date.now() - 7 * 24 * 60 * 60 * 1000,
              ),
            },
          },
        }),
      ]);

    return { open, inProgress, recentlyCompleted };
  }
}
