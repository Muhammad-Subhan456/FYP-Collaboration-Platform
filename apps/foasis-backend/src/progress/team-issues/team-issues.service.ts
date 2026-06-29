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
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ProposalsService } from '../../proposals/proposals.service';
import { ProfilesService } from '../../users/profiles.service';
import { TeamAccessService } from '../common/team-access.service';

import { CompleteTeamIssueDto } from './dto/complete-team-issue.dto';
import { CreateTeamIssueCommentDto } from './dto/create-team-issue-comment.dto';
import { CreateTeamIssueDto } from './dto/create-team-issue.dto';
import { UpdateTeamIssueDto } from './dto/update-team-issue.dto';
import { parseGithubLinks } from './helpers/github-url';

const ISSUE_INCLUDE = {
  comments: { orderBy: { createdAt: 'asc' as const } },
  activities: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class TeamIssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamAccessService: TeamAccessService,
    private readonly proposalsService: ProposalsService,
    private readonly profilesService: ProfilesService,
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
    await this.prisma.teamIssueActivity.create({
      data: {
        issueId,
        teamId,
        actorId,
        type,
        description,
      },
    });
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
  ) {
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
      include: ISSUE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getIssuesForTeamIds(teamIds: string[]) {
    if (!teamIds.length) {
      return [];
    }

    return this.prisma.teamIssue.findMany({
      where: { teamId: { in: teamIds } },
      include: ISSUE_INCLUDE,
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

    return issue;
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

    const updated = await this.prisma.teamIssue.update({
      where: { id: issueId },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        priority: dto.priority,
        labels: dto.labels,
      },
      include: ISSUE_INCLUDE,
    });

    const name = await this.actorName(authUserId);
    await this.logActivity(
      issue.id,
      issue.teamId,
      authUserId,
      'UPDATED',
      `${name} updated the issue`,
    );

    return updated;
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

    const updated = await this.prisma.teamIssue.update({
      where: { id: issueId },
      data: {
        status: 'IN_PROGRESS',
        assignedToId: authUserId,
      },
      include: ISSUE_INCLUDE,
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

    return updated;
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

    const updated = await this.prisma.teamIssue.update({
      where: { id: issueId },
      data: {
        status: 'OPEN',
        assignedToId: null,
      },
      include: ISSUE_INCLUDE,
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

    return updated;
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

    const updated = await this.prisma.teamIssue.update({
      where: { id: issueId },
      data: {
        status: 'COMPLETED',
        githubPrUrl: evidence.githubPrUrl,
        githubCommitUrl: evidence.githubCommitUrl,
        completedAt: new Date(),
      },
      include: ISSUE_INCLUDE,
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

    return updated;
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

    const issue = await this.assertIssueAccess(
      issueId,
      authUserId,
      role,
    );

    const comment = await this.prisma.teamIssueComment.create({
      data: {
        issueId,
        teamId: issue.teamId,
        authUserId,
        body: dto.body.trim(),
      },
    });

    const name = await this.actorName(authUserId);
    const activityLabel =
      role === 'SUPERVISOR'
        ? 'Supervisor commented'
        : `${name} commented`;

    await this.logActivity(
      issueId,
      issue.teamId,
      authUserId,
      'COMMENTED',
      activityLabel,
    );

    await this.notifyTeamAndSupervisor(issue.teamId, {
      title: 'New issue comment',
      message: `${name} commented on "${issue.title}".`,
      type: 'TEAM_ISSUE_COMMENTED',
      entityId: issue.id,
    });

    return comment;
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
      include: ISSUE_INCLUDE,
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
