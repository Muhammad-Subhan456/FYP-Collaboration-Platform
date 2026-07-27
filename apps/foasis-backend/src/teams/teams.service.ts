import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { JoinRequest, Prisma, ProposalStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { DEFAULT_WORKSPACE_ID } from '../workspace/workspace.constants';
import {
  getWorkspaceIdFromContext,
  runWithWorkspaceContext,
} from '../workspace/workspace-als';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { ProfilesService } from '../users/profiles.service';
import { ProposalsService } from '../proposals/proposals.service';
import { DomainEvents } from '../domain-events/domain-event.constants';
import { DomainEventService } from '../domain-events/domain-event.service';
import type {
  DomainEventScope,
  TeamJoinRequestReceivedPayload,
  TeamJoinRequestResolvedPayload,
  TeamMemberJoinedPayload,
  TeamMemberLeftPayload,
  TeamRoleUpdatedPayload,
} from '../domain-events/domain-event.types';
import { isTeamProfileComplete } from './team-profile.util';
import { validateProposalContent } from '../proposals/proposal-constants';
import {
  serializeJoinRequest,
  serializeTeamMember,
} from './teams-realtime';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly profilesService: ProfilesService,
    @Inject(forwardRef(() => ProposalsService))
    private readonly proposalsService: ProposalsService,
    private readonly domainEventService: DomainEventService,
  ) {}

  /** Prefer explicit workspaceId; fall back to ALS so HTTP requests stay tenant-scoped. */
  private resolveWorkspaceId(workspaceId?: string): string | undefined {
    return workspaceId ?? getWorkspaceIdFromContext();
  }

  private membershipWhere(authUserId: string, workspaceId?: string) {
    const scopedWorkspaceId = this.resolveWorkspaceId(workspaceId);
    return {
      authUserId,
      ...(scopedWorkspaceId
        ? { team: { workspaceId: scopedWorkspaceId } }
        : {}),
    };
  }

  private leaderTeamWhere(leaderId: string, workspaceId?: string) {
    const scopedWorkspaceId = this.resolveWorkspaceId(workspaceId);
    return {
      leaderId,
      ...(scopedWorkspaceId ? { workspaceId: scopedWorkspaceId } : {}),
    };
  }

  async isTeamWorkflowLocked(teamId: string): Promise<boolean> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { teamId },
      select: { status: true },
    });

    return (
      proposal?.status === 'SUPERVISOR_ASSIGNED' ||
      proposal?.status === 'APPROVED'
    );
  }

  private async assertTeamNotLocked(teamId: string) {
    if (await this.isTeamWorkflowLocked(teamId)) {
      throw new BadRequestException(
        'Team workflow is locked after supervisor acceptance',
      );
    }
  }

  private async rejectPendingJoinRequestsForUser(
    authUserId: string,
    actorId: string,
    workspaceId: string,
  ) {
    const staleRequests = await this.prisma.joinRequest.findMany({
      where: {
        authUserId,
        status: 'PENDING',
        team: { workspaceId },
      },
    });

    if (staleRequests.length === 0) {
      return [];
    }

    await this.prisma.joinRequest.updateMany({
      where: {
        authUserId,
        status: 'PENDING',
        team: { workspaceId },
      },
      data: { status: 'REJECTED' },
    });

    for (const stale of staleRequests) {
      this.publishTeamEvent(
        DomainEvents.TEAM_JOIN_REQUEST_RESOLVED,
        actorId,
        { type: 'team', id: stale.teamId },
        {
          teamId: stale.teamId,
          joinRequest: serializeJoinRequest({
            ...stale,
            status: 'REJECTED',
          }),
        },
        stale.id,
      );
    }

    return staleRequests;
  }

  async createTeam(
    leaderId: string,
    createTeamDto: CreateTeamDto,
    workspaceId: string = DEFAULT_WORKSPACE_ID,
  ) {

    const existingMembership =
      await this.prisma.teamMember.findFirst({
        where: {
          authUserId: leaderId,
          team: { workspaceId },
        },
      });

    if (existingMembership) {
      throw new BadRequestException(
        'User already belongs to a team',
      );
    }

    const team =
      await this.prisma.team.create({
        data: {
          name: createTeamDto.name,
          domain: createTeamDto.domain,
          projectTitle: createTeamDto.projectTitle?.trim() || null,
          projectAbstract:
            createTeamDto.projectAbstract?.trim() || null,
          maxMembers:
            createTeamDto.maxMembers,
          leaderId,
          workspaceId,
        },
      });

    await this.prisma.teamMember.create({
      data: {
        teamId: team.id,
        authUserId: leaderId,
      },
    });

    const createdPayload = {
      workspaceId: team.workspaceId,
      teamId: team.id,
      leaderId,
      team: {
        id: team.id,
        name: team.name,
        domain: team.domain,
        projectTitle: team.projectTitle,
        projectAbstract: team.projectAbstract,
        maxMembers: team.maxMembers,
        isOpen: team.isOpen,
      },
    };

    this.publishTeamEvent(
      DomainEvents.TEAM_CREATED,
      leaderId,
      { type: 'user', id: leaderId },
      createdPayload,
      team.id,
    );
    this.publishTeamEvent(
      DomainEvents.TEAM_CREATED,
      leaderId,
      { type: 'workspace', id: team.workspaceId },
      createdPayload,
      team.id,
    );

    return team;
  }

async getAllTeams(workspaceId: string) {
  return this.prisma.team.findMany({
    where: this.browseTeamsWhere(workspaceId),
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async searchByDomain(domain: string, workspaceId: string) {
  return this.prisma.team.findMany({
    where: {
      domain: {
        contains: domain,
        mode: 'insensitive',
      },
      ...this.browseTeamsWhere(workspaceId),
    },
  });
}

private browseTeamsWhere(workspaceId: string) {
  return {
    workspaceId,
    isOpen: true,
    NOT: {
      proposal: {
        status: {
          in: [
            ProposalStatus.SUPERVISOR_ASSIGNED,
            ProposalStatus.APPROVED,
          ],
        },
      },
    },
  };
}
async requestToJoin(
  teamId: string,
  authUserId: string,
) {
  const team = await this.prisma.team.findFirst({
    where: { id: teamId },
  });

  if (!team) {
    throw new BadRequestException(
      'Team not found',
    );
  }

  const existingMembership =
    await this.prisma.teamMember.findFirst({
      where: {
        authUserId,
        team: { workspaceId: team.workspaceId },
      },
    });

  if (existingMembership) {
    throw new BadRequestException(
      'User already belongs to a team',
    );
  }

  await this.assertTeamNotLocked(teamId);

  const currentMembers =
    await this.prisma.teamMember.count({
      where: {
        teamId,
      },
    });

  if (currentMembers >= team.maxMembers) {
    throw new BadRequestException(
      'Team is already full',
    );
  }

  const existingRequest =
    await this.prisma.joinRequest.findUnique({
      where: {
        teamId_authUserId: {
          teamId,
          authUserId,
        },
      },
    });

  if (existingRequest?.status === 'PENDING') {
    throw new BadRequestException(
      'Join request already pending',
    );
  }

  const request = existingRequest
    ? await this.prisma.joinRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: 'PENDING',
          createdAt: new Date(),
        },
      })
    : await this.prisma.joinRequest.create({
        data: {
          teamId,
          authUserId,
        },
      });

  await this.notifyJoinRequestReceived(team, request, authUserId);

  return request;
}

private async notifyJoinRequestReceived(
  team: { id: string; name: string; leaderId: string },
  request: JoinRequest,
  authUserId: string,
) {
  try {
    await this.notificationDispatch.send({
      authUserId: team.leaderId,
      title: 'FOASIS Team Join Request',
      message: `A student has requested to join your team "${team.name}".`,
      type: 'JOIN_REQUEST_RECEIVED',
      entityType: 'TEAM',
      entityId: team.id,
      route: '/student/team',
    });
  } catch (error) {
    console.error(
      'Failed to notify team leader of join request',
      error,
    );
  }

  const receivedPayload: TeamJoinRequestReceivedPayload = {
    teamId: team.id,
    joinRequest: serializeJoinRequest(request),
  };

  this.publishTeamEvent(
    DomainEvents.TEAM_JOIN_REQUEST_RECEIVED,
    authUserId,
    { type: 'team', id: team.id },
    receivedPayload,
    request.id,
  );
}

async getBrowseTeamDetails(teamId: string, workspaceId: string) {
  const team = await this.prisma.team.findFirst({
    where: {
      id: teamId,
      ...this.browseTeamsWhere(workspaceId),
    },
  });

  if (!team) {
    throw new NotFoundException(
      'Team not found or is not available to join',
    );
  }

  const members = await this.getTeamMembers(team.id);
  const profileIds = [
    team.leaderId,
    ...members.map((member) => member.authUserId),
  ];

  const profiles =
    await this.profilesService
      .findManyByAuthUserIds([...new Set(profileIds)])
      .catch(() => ({}));

  return {
    team,
    members,
    profiles,
    memberCount: members.length,
  };
}

async getMyTeamRequests(
  leaderId: string,
  workspaceId?: string,
) {
  const team = await this.prisma.team.findFirst({
    where: this.leaderTeamWhere(leaderId, workspaceId),
  });

  if (!team) {
    throw new BadRequestException(
      'You are not leading any team',
    );
  }

  return this.prisma.joinRequest.findMany({
    where: {
      teamId: team.id,
      status: 'PENDING',
    },
  });
}

async approveRequest(
  requestId: string,
  leaderId: string,
) {
  const request = await this.prisma.joinRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new BadRequestException('Request not found');
  }

  if (request.status !== 'PENDING') {
    throw new BadRequestException(
      'This join request is no longer pending',
    );
  }

  const team = await this.prisma.team.findUnique({
    where: { id: request.teamId },
  });

  if (!team) {
    throw new BadRequestException('Team not found');
  }

  if (team.leaderId !== leaderId) {
    throw new ForbiddenException('Not your team');
  }

  const existingMembership =
    await this.prisma.teamMember.findFirst({
      where: {
        authUserId: request.authUserId,
        team: { workspaceId: team.workspaceId },
      },
    });

  if (existingMembership) {
    await this.rejectPendingJoinRequestsForUser(
      request.authUserId,
      leaderId,
      team.workspaceId,
    );

    throw new BadRequestException(
      'This student already belongs to another team',
    );
  }

  await this.assertTeamNotLocked(team.id);

  const freshRequest = await this.prisma.joinRequest.findUnique({
    where: { id: requestId },
  });

  if (!freshRequest || freshRequest.status !== 'PENDING') {
    throw new BadRequestException(
      'This join request is no longer pending',
    );
  }

  const existingMember = await this.prisma.teamMember.findFirst({
    where: {
      authUserId: freshRequest.authUserId,
      team: { workspaceId: team.workspaceId },
    },
  });

  if (existingMember) {
    await this.rejectPendingJoinRequestsForUser(
      freshRequest.authUserId,
      leaderId,
      team.workspaceId,
    );

    throw new BadRequestException(
      'This student already belongs to another team',
    );
  }

  const currentMembers = await this.prisma.teamMember.count({
    where: { teamId: team.id },
  });

  if (currentMembers >= team.maxMembers) {
    throw new BadRequestException('Team is already full');
  }

  let member;
  try {
    member = await this.prisma.teamMember.create({
      data: {
        teamId: team.id,
        authUserId: freshRequest.authUserId,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      await this.rejectPendingJoinRequestsForUser(
        freshRequest.authUserId,
        leaderId,
        team.workspaceId,
      );

      throw new BadRequestException(
        'This student already belongs to another team',
      );
    }

    throw error;
  }

  const approveResult = await this.prisma.joinRequest.updateMany({
    where: {
      id: requestId,
      status: 'PENDING',
    },
    data: { status: 'APPROVED' },
  });

  if (approveResult.count === 0) {
    await this.prisma.teamMember
      .delete({ where: { id: member.id } })
      .catch(() => undefined);

    throw new BadRequestException(
      'This join request is no longer pending',
    );
  }

  const approvedRequest =
    await this.prisma.joinRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

  const cancelledRequests = await this.prisma.joinRequest.findMany({
    where: {
      authUserId: freshRequest.authUserId,
      status: 'PENDING',
      id: { not: requestId },
      team: { workspaceId: team.workspaceId },
    },
  });

  if (cancelledRequests.length > 0) {
    await this.prisma.joinRequest.updateMany({
      where: {
        authUserId: freshRequest.authUserId,
        status: 'PENDING',
        id: { not: requestId },
        team: { workspaceId: team.workspaceId },
      },
      data: { status: 'REJECTED' },
    });
  }

  const memberCount = await this.prisma.teamMember.count({
    where: { teamId: team.id },
  });

  if (memberCount >= team.maxMembers) {
    await this.prisma.team.update({
      where: { id: team.id },
      data: { isOpen: false },
    });
  }

  try {
    await this.notificationDispatch.send({
      authUserId: approvedRequest.authUserId,
      title: 'Join Request Approved',
      message: `You have been accepted into team ${team.name}`,
      type: 'JOIN_REQUEST_APPROVED',
      entityType: 'TEAM',
      entityId: team.id,
      route: '/student/team',
    });
  } catch (error) {
    console.error('Failed to create notification', error);
  }

  const resolvedPayload: TeamJoinRequestResolvedPayload = {
    teamId: team.id,
    joinRequest: serializeJoinRequest(approvedRequest),
  };

  this.publishTeamEvent(
    DomainEvents.TEAM_JOIN_REQUEST_RESOLVED,
    leaderId,
    { type: 'team', id: team.id },
    resolvedPayload,
    approvedRequest.id,
  );
  this.publishTeamEvent(
    DomainEvents.TEAM_JOIN_REQUEST_RESOLVED,
    leaderId,
    { type: 'user', id: approvedRequest.authUserId },
    resolvedPayload,
    approvedRequest.id,
  );

  for (const cancelled of cancelledRequests) {
    const cancelledPayload: TeamJoinRequestResolvedPayload = {
      teamId: cancelled.teamId,
      joinRequest: serializeJoinRequest({
        ...cancelled,
        status: 'REJECTED',
      }),
    };

    this.publishTeamEvent(
      DomainEvents.TEAM_JOIN_REQUEST_RESOLVED,
      leaderId,
      { type: 'team', id: cancelled.teamId },
      cancelledPayload,
      cancelled.id,
    );
    this.publishTeamEvent(
      DomainEvents.TEAM_JOIN_REQUEST_RESOLVED,
      leaderId,
      { type: 'user', id: cancelled.authUserId },
      cancelledPayload,
      cancelled.id,
    );
  }

  const joinedPayload: TeamMemberJoinedPayload = {
    teamId: team.id,
    member: serializeTeamMember(member),
  };

  this.publishTeamEvent(
    DomainEvents.TEAM_MEMBER_JOINED,
    leaderId,
    { type: 'team', id: team.id },
    joinedPayload,
    member.id,
  );
  this.publishTeamEvent(
    DomainEvents.TEAM_MEMBER_JOINED,
    leaderId,
    { type: 'user', id: approvedRequest.authUserId },
    joinedPayload,
    member.id,
  );

  return {
    message: 'Request approved successfully',
  };
}

async rejectRequest(
  requestId: string,
  leaderId: string,
) {
  const request =
    await this.prisma.joinRequest.findUnique({
      where: {
        id: requestId,
      },
    });

  if (!request) {
    throw new BadRequestException(
      'Request not found',
    );
  }

  const team =
    await this.prisma.team.findUnique({
      where: {
        id: request.teamId,
      },
    });

  if (!team) {
    throw new BadRequestException(
      'Team not found',
    );
  }

  if (team.leaderId !== leaderId) {
    throw new ForbiddenException(
      'Not your team',
    );
  }

await this.prisma.joinRequest.update({
  where: {
    id: requestId,
  },
  data: {
    status: 'REJECTED',
  },
});

// Create notification
try {
  await this.notificationDispatch.send({
    authUserId: request.authUserId,
    title: 'Join Request Rejected',
    message: `Your request to join team ${team.name} was rejected`,
    type: 'JOIN_REQUEST_REJECTED',
    entityType: 'TEAM',
    entityId: team.id,
    route: '/student/team',
  });
} catch (error) {
  console.error(
    'Failed to create notification',
  );
}

const rejectedJoinRequest = await this.prisma.joinRequest.findUniqueOrThrow({
  where: { id: requestId },
});

const resolvedPayload: TeamJoinRequestResolvedPayload = {
  teamId: team.id,
  joinRequest: serializeJoinRequest(rejectedJoinRequest),
};

this.publishTeamEvent(
  DomainEvents.TEAM_JOIN_REQUEST_RESOLVED,
  leaderId,
  { type: 'team', id: team.id },
  resolvedPayload,
  requestId,
);
this.publishTeamEvent(
  DomainEvents.TEAM_JOIN_REQUEST_RESOLVED,
  leaderId,
  { type: 'user', id: request.authUserId },
  resolvedPayload,
  requestId,
);

return {
  message: 'Request rejected successfully',
};
}

async getMyTeam(authUserId: string, workspaceId?: string) {
  const membership =
    await this.prisma.teamMember.findFirst({
      where: this.membershipWhere(authUserId, workspaceId),
      include: {
        team: true,
      },
    });

  return membership?.team ?? null;
}

async getTeamMembers(teamId: string) {
  return this.prisma.teamMember.findMany({
    where: {
      teamId,
    },
  });
}

/**
 * JWT callers must be a coordinator, team member, or assigned supervisor.
 * Internal API-key callers must supply a workspaceId (header) so ALS can scope.
 */
async getTeamMembersForRequester(
  teamId: string,
  user?: { userId: string; role: string } | null,
  workspaceId?: string,
) {
  if (!user) {
    if (!workspaceId) {
      throw new BadRequestException(
        'Workspace context is required for internal team member access',
      );
    }

    return runWithWorkspaceContext(workspaceId, async () => {
      const team = await this.prisma.team.findFirst({
        where: { id: teamId, workspaceId },
        select: { id: true },
      });
      if (!team) {
        throw new NotFoundException('Team not found');
      }
      return this.getTeamMembers(teamId);
    });
  }

  if (user.role === 'COORDINATOR') {
    if (workspaceId) {
      const team = await this.prisma.team.findFirst({
        where: { id: teamId, workspaceId },
        select: { id: true },
      });
      if (!team) {
        throw new NotFoundException('Team not found');
      }
    }
    return this.getTeamMembers(teamId);
  }

  if (user.role === 'STUDENT') {
    const membership = await this.prisma.teamMember.findFirst({
      where: { teamId, authUserId: user.userId },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenException(
        'You can only view members of your own team',
      );
    }
    return this.getTeamMembers(teamId);
  }

  if (user.role === 'SUPERVISOR') {
    const supervised = await this.prisma.proposal.findFirst({
      where: {
        teamId,
        assignedSupervisorId: user.userId,
      },
      select: { id: true },
    });
    if (!supervised) {
      throw new ForbiddenException(
        'You can only view members of teams you supervise',
      );
    }
    return this.getTeamMembers(teamId);
  }

  throw new ForbiddenException(
    'You do not have permission to view team members',
  );
}

async getMyTeamMembers(
  authUserId: string,
  teamId?: string,
  workspaceId?: string,
) {
  const resolvedTeamId =
    teamId ??
    (
      await this.prisma.teamMember.findFirst({
        where: this.membershipWhere(authUserId, workspaceId),
        select: { teamId: true },
      })
    )?.teamId;

  if (!resolvedTeamId) {
    throw new BadRequestException(
      'User does not belong to any team',
    );
  }

  return this.prisma.teamMember.findMany({
    where: {
      teamId: resolvedTeamId,
    },
  });
}

async getTeamCountForCoordinator(workspaceId: string) {
  return this.prisma.team.count({
    where: { workspaceId },
  });
}

async getAllTeamsForCoordinator(workspaceId: string) {
  return this.prisma.team.findMany({
    where: { workspaceId },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async getTeamContextForMember(
  authUserId: string,
  workspaceId?: string,
) {
  const membership =
    await this.prisma.teamMember.findFirst({
      where: this.membershipWhere(authUserId, workspaceId),
      include: { team: true },
    });

  if (!membership) {
    return null;
  }

  const team = membership.team;

  const members = await this.prisma.teamMember.findMany({
    where: { teamId: team.id },
  });

  return {
    team,
    membership,
    memberCount: members.length,
    isLeader: team.leaderId === authUserId,
  };
}

async updateMemberRole(
  leaderId: string,
  memberId: string,
  teamRole?: string,
  workspaceId?: string,
) {
  const team = await this.prisma.team.findFirst({
    where: this.leaderTeamWhere(leaderId, workspaceId),
  });

  if (!team) {
    throw new ForbiddenException(
      'Only team leaders can assign roles',
    );
  }

  await this.assertTeamNotLocked(team.id);

  const member =
    await this.prisma.teamMember.findUnique({
      where: { id: memberId },
    });

  if (!member || member.teamId !== team.id) {
    throw new BadRequestException(
      'Member not found in your team',
    );
  }

  const previousRole = member.teamRole;

  const updated = await this.prisma.teamMember.update({
    where: { id: memberId },
    data: {
      teamRole: teamRole?.trim() || null,
    },
  });

  const normalizedRole = teamRole?.trim() || null;
  const title = previousRole
    ? 'Team Role Updated'
    : normalizedRole
      ? 'Team Role Assigned'
      : 'Team Role Removed';

  const message = normalizedRole
    ? `Your team leader assigned you the role "${normalizedRole}" in team "${team.name}".`
    : `Your team leader removed your role in team "${team.name}".`;

  const notificationType = previousRole
    ? 'TEAM_ROLE_UPDATED'
    : normalizedRole
      ? 'TEAM_ROLE_ASSIGNED'
      : 'TEAM_ROLE_REMOVED';

  try {
    await this.notificationDispatch.send({
      authUserId: member.authUserId,
      title,
      message,
      type: notificationType,
      entityType: 'TEAM',
      entityId: team.id,
      route: '/student/team',
    });
  } catch (error) {
    console.error(
      'Failed to notify member of role change',
      error,
    );
  }

  const rolePayload: TeamRoleUpdatedPayload = {
    teamId: team.id,
    member: serializeTeamMember(updated),
  };

  this.publishTeamEvent(
    DomainEvents.TEAM_ROLE_UPDATED,
    leaderId,
    { type: 'team', id: team.id },
    rolePayload,
    updated.id,
  );

  return updated;
}

async getStudentTeamOverview(
  authUserId: string,
  workspaceId: string,
) {
  const team = await this.getMyTeam(authUserId, workspaceId);

  if (!team) {
    const [browseTeams, pendingRequests] = await Promise.all([
      this.getAllTeams(workspaceId).catch(() => []),
      this.prisma.joinRequest
        .findMany({
          where: {
            authUserId,
            status: 'PENDING',
            team: { workspaceId },
          },
          select: { teamId: true },
        })
        .catch(() => []),
    ]);

    return {
      team: null,
      members: [],
      joinRequests: [],
      isLeader: false,
      profiles: {},
      browseTeams,
      pendingJoinTeamIds: pendingRequests.map(
        (request) => request.teamId,
      ),
    };
  }

  const isLeader = team.leaderId === authUserId;

  const [members, joinRequests] = await Promise.all([
    this.getTeamMembers(team.id).catch(() => []),
    isLeader
      ? this.getMyTeamRequests(authUserId, workspaceId).catch(() => [])
      : Promise.resolve([]),
  ]);

  const profileIds = [
    team.leaderId,
    ...members.map((member) => member.authUserId),
    ...joinRequests.map((request) => request.authUserId),
  ];

  const profiles =
    await this.profilesService
      .findManyByAuthUserIds([...new Set(profileIds)])
      .catch(() => ({}));

  const isWorkflowLocked = await this.isTeamWorkflowLocked(team.id);
  const isProfileComplete = isTeamProfileComplete(team);

  return {
    team,
    members,
    joinRequests,
    isLeader,
    profiles,
    isWorkflowLocked,
    isProfileComplete,
    canEditProfile: isLeader && !isWorkflowLocked,
    canDeleteTeam: isLeader && !isWorkflowLocked,
    canLeaveTeam: !isLeader && !isWorkflowLocked,
  };
}

  async updateTeam(
    leaderId: string,
    updateTeamDto: UpdateTeamDto,
    workspaceId?: string,
  ) {
    const team = await this.prisma.team.findFirst({
      where: this.leaderTeamWhere(leaderId, workspaceId),
    });

    if (!team) {
      throw new BadRequestException('You are not leading any team');
    }

    await this.assertTeamNotLocked(team.id);

    const proposalPdfUrl =
      updateTeamDto.proposalPdfUrl === null
        ? null
        : updateTeamDto.proposalPdfUrl?.trim() || null;

    const domains = (updateTeamDto.domains ?? [])
      .map((domain) => domain.trim())
      .filter(Boolean);
    const otherDomain = updateTeamDto.otherDomain?.trim() || null;
    const nature = updateTeamDto.nature ?? null;
    const sdgs = updateTeamDto.sdgs ?? [];
    const sdgJustification = updateTeamDto.sdgJustification?.trim() || null;
    const previousObjectives =
      updateTeamDto.previousObjectives?.trim() || null;
    const projectAbstract = updateTeamDto.projectAbstract.trim();

    // Legacy free-text domain kept meaningful for existing views/search.
    const legacyDomain = domains.length
      ? [...domains, ...(otherDomain ? [otherDomain] : [])].join(', ')
      : otherDomain || updateTeamDto.domain?.trim() || '';

    const errors = validateProposalContent({
      nature,
      domains,
      otherDomain,
      abstract: projectAbstract,
      previousObjectives,
      sdgs,
      sdgJustification,
    });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    const updated = await this.prisma.team.update({
      where: { id: team.id },
      data: {
        name: updateTeamDto.name.trim(),
        domain: legacyDomain,
        domains,
        otherDomain,
        nature,
        sdgs,
        sdgJustification,
        previousObjectives,
        projectTitle: updateTeamDto.projectTitle.trim(),
        projectAbstract,
        proposalPdfUrl,
      },
    });

    await this.proposalsService.syncProposalFromTeam(team.id);

    if (isTeamProfileComplete(updated)) {
      await this.proposalsService
        .ensureProposalForTeam(team.id, leaderId)
        .catch(() => undefined);
    }

    const payload = {
      workspaceId: updated.workspaceId,
      teamId: updated.id,
      isProfileComplete: isTeamProfileComplete(updated),
      team: {
        id: updated.id,
        name: updated.name,
        domain: updated.domain,
        domains: updated.domains,
        otherDomain: updated.otherDomain,
        nature: updated.nature,
        sdgs: updated.sdgs,
        sdgJustification: updated.sdgJustification,
        previousObjectives: updated.previousObjectives,
        projectTitle: updated.projectTitle,
        projectAbstract: updated.projectAbstract,
        proposalPdfUrl: updated.proposalPdfUrl,
        maxMembers: updated.maxMembers,
        isOpen: updated.isOpen,
      },
    };

    this.publishTeamEvent(
      DomainEvents.TEAM_UPDATED,
      leaderId,
      { type: 'team', id: updated.id },
      payload,
      updated.id,
    );
    this.publishTeamEvent(
      DomainEvents.TEAM_UPDATED,
      leaderId,
      { type: 'workspace', id: updated.workspaceId },
      payload,
      updated.id,
    );

    return updated;
  }

  async deleteTeam(leaderId: string, workspaceId?: string) {
  const team = await this.prisma.team.findFirst({
    where: this.leaderTeamWhere(leaderId, workspaceId),
  });

  if (!team) {
    throw new BadRequestException('You are not leading any team');
  }

  await this.assertTeamNotLocked(team.id);

  const memberIds = (
    await this.prisma.teamMember.findMany({
      where: { teamId: team.id },
      select: { authUserId: true },
    })
  ).map((member) => member.authUserId);

  const proposal = await this.prisma.proposal.findUnique({
    where: { teamId: team.id },
    select: { id: true },
  });

  const deletedPayload = {
    workspaceId: team.workspaceId,
    teamId: team.id,
    name: team.name,
  };

  // Emit before delete so members still in the team room receive it.
  this.publishTeamEvent(
    DomainEvents.TEAM_DELETED,
    leaderId,
    { type: 'team', id: team.id },
    deletedPayload,
    team.id,
  );
  this.publishTeamEvent(
    DomainEvents.TEAM_DELETED,
    leaderId,
    { type: 'workspace', id: team.workspaceId },
    deletedPayload,
    team.id,
  );

  await this.prisma.$transaction(async (tx) => {
    if (proposal) {
      await tx.supervisorRequest.deleteMany({
        where: { proposalId: proposal.id },
      });
      await tx.supervisorInvitation.deleteMany({
        where: { proposalId: proposal.id },
      });
      await tx.proposal.delete({ where: { id: proposal.id } });
    }

    await tx.joinRequest.deleteMany({ where: { teamId: team.id } });
    await tx.teamMember.deleteMany({ where: { teamId: team.id } });
    await tx.team.delete({ where: { id: team.id } });
  });

  await Promise.allSettled(
    memberIds
      .filter((id) => id !== leaderId)
      .map((authUserId) =>
        this.notificationDispatch.send({
          authUserId,
          title: 'Team Disbanded',
          message: `Team "${team.name}" has been deleted by the leader.`,
          type: 'TEAM_DELETED',
          entityType: 'TEAM',
          entityId: team.id,
          route: '/student/team',
        }),
      ),
  );

  return { message: 'Team deleted successfully' };
}

async leaveTeam(authUserId: string, workspaceId?: string) {
  const membership = await this.prisma.teamMember.findFirst({
    where: this.membershipWhere(authUserId, workspaceId),
    include: { team: true },
  });

  if (!membership?.team) {
    throw new BadRequestException('You are not in a team');
  }

  if (membership.team.leaderId === authUserId) {
    throw new BadRequestException(
      'Team leaders must delete the team instead of leaving',
    );
  }

  await this.assertTeamNotLocked(membership.teamId);

  const leftPayload: TeamMemberLeftPayload = {
    teamId: membership.teamId,
    memberId: membership.id,
    authUserId: membership.authUserId,
  };

  this.publishTeamEvent(
    DomainEvents.TEAM_MEMBER_LEFT,
    authUserId,
    { type: 'team', id: membership.teamId },
    leftPayload,
    membership.id,
  );

  await this.prisma.teamMember.delete({
    where: { id: membership.id },
  });

  const memberCount = await this.prisma.teamMember.count({
    where: { teamId: membership.teamId },
  });

  if (memberCount < membership.team.maxMembers) {
    await this.prisma.team.update({
      where: { id: membership.teamId },
      data: { isOpen: true },
    });
  }

  try {
    await this.notificationDispatch.send({
      authUserId: membership.team.leaderId,
      title: 'Member Left Team',
      message: `A member has left team "${membership.team.name}".`,
      type: 'TEAM_MEMBER_LEFT',
      entityType: 'TEAM',
      entityId: membership.teamId,
      route: '/student/team',
    });
  } catch {
    // non-blocking
  }

  return { message: 'You have left the team' };
}

private publishTeamEvent(
  name: string,
  actorId: string | undefined,
  scope: DomainEventScope,
  payload: object,
  entityId: string,
) {
  this.domainEventService.emitSafe({
    name,
    timestamp: new Date().toISOString(),
    actorId,
    scope,
    entity: { type: 'TEAM', id: entityId },
    payload,
  });
}

}