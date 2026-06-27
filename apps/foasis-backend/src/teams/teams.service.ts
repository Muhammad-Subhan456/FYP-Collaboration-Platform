import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { ProfilesService } from '../users/profiles.service';
import { ProposalsService } from '../proposals/proposals.service';
import { isTeamProfileComplete } from './team-profile.util';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly profilesService: ProfilesService,
    @Inject(forwardRef(() => ProposalsService))
    private readonly proposalsService: ProposalsService,
  ) {}

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

  async createTeam(
    leaderId: string,
    createTeamDto: CreateTeamDto,
  ) {

    const existingMembership =
      await this.prisma.teamMember.findUnique({
        where: {
          authUserId: leaderId!
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
        },
      });

    await this.prisma.teamMember.create({
      data: {
        teamId: team.id,
        authUserId: leaderId,
      },
    });

    return team;
  }

async getAllTeams() {
  return this.prisma.team.findMany({
    where: {
      isOpen: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async searchByDomain(domain: string) {
  return this.prisma.team.findMany({
    where: {
      domain: {
        contains: domain,
        mode: 'insensitive',
      },
      isOpen: true,
    },
  });
}
async requestToJoin(
  teamId: string,
  authUserId: string,
) {
  const existingMembership =
    await this.prisma.teamMember.findFirst({
      where: {
        authUserId,
      },
    });

  if (existingMembership) {
    throw new BadRequestException(
      'User already belongs to a team',
    );
  }

  const team = await this.prisma.team.findUnique({
    where: {
      id: teamId,
    },
  });

  if (!team) {
    throw new BadRequestException(
      'Team not found',
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
    await this.prisma.joinRequest.findFirst({
      where: {
        teamId,
        authUserId,
      },
    });

  if (existingRequest) {
    throw new BadRequestException(
      'Join request already exists',
    );
  }

  return this.prisma.joinRequest.create({
    data: {
      teamId,
      authUserId,
    },
  }).then(async (request) => {
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
    return request;
  });
}

async getMyTeamRequests(
  leaderId: string,
) {
  const team = await this.prisma.team.findFirst({
    where: {
      leaderId,
    },
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

const team = await this.prisma.team.findUnique({
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

await this.assertTeamNotLocked(team.id);

const currentMembers =
  await this.prisma.teamMember.count({
    where: {
      teamId: team.id,
    },
  });

if (currentMembers >= team.maxMembers) {
  throw new BadRequestException(
    'Team is already full',
  );
}
await this.prisma.teamMember.create({
  data: {
    teamId: team.id,
    authUserId: request.authUserId,
  },
});

const memberCount =
  await this.prisma.teamMember.count({
    where: {
      teamId: team.id,
    },
  });

if (memberCount >= team.maxMembers) {
  await this.prisma.team.update({
    where: {
      id: team.id,
    },
    data: {
      isOpen: false,
    },
  });
}

await this.prisma.joinRequest.update({
  where: {
    id: request.id,
  },
  data: {
    status: 'APPROVED',
  },
});

// Create notification
try {
  await this.notificationDispatch.send({
    authUserId: request.authUserId,
    title: 'Join Request Approved',
    message: `You have been accepted into team ${team.name}`,
    type: 'JOIN_REQUEST_APPROVED',
    entityType: 'TEAM',
    entityId: team.id,
    route: '/student/team',
  });
} catch (error) {
  console.error(
    'Failed to create notification',
  );
}

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

return {
  message: 'Request rejected successfully',
};
}

async getMyTeam(authUserId: string) {
  const membership =
    await this.prisma.teamMember.findFirst({
      where: {
        authUserId,
      },
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

async getMyTeamMembers(
  authUserId: string,
  teamId?: string,
) {
  const resolvedTeamId =
    teamId ??
    (
      await this.prisma.teamMember.findFirst({
        where: { authUserId },
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

async getTeamCountForCoordinator() {
  return this.prisma.team.count();
}

async getAllTeamsForCoordinator() {
  return this.prisma.team.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async getTeamContextForMember(authUserId: string) {
  const membership =
    await this.prisma.teamMember.findUnique({
      where: { authUserId },
    });

  if (!membership) {
    return null;
  }

  const team = await this.prisma.team.findUnique({
    where: { id: membership.teamId },
  });

  if (!team) {
    return null;
  }

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
) {
  const team = await this.prisma.team.findFirst({
    where: { leaderId },
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

  return updated;
}

async getStudentTeamOverview(authUserId: string) {
  const team = await this.getMyTeam(authUserId);

  if (!team) {
    const browseTeams = await this.getAllTeams().catch(() => []);

    return {
      team: null,
      members: [],
      joinRequests: [],
      isLeader: false,
      profiles: {},
      browseTeams,
    };
  }

  const isLeader = team.leaderId === authUserId;

  const [members, joinRequests] = await Promise.all([
    this.getTeamMembers(team.id).catch(() => []),
    isLeader
      ? this.getMyTeamRequests(authUserId).catch(() => [])
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
  ) {
    const team = await this.prisma.team.findFirst({
      where: { leaderId },
    });

    if (!team) {
      throw new BadRequestException('You are not leading any team');
    }

    await this.assertTeamNotLocked(team.id);

    const proposalPdfUrl =
      updateTeamDto.proposalPdfUrl === null
        ? null
        : updateTeamDto.proposalPdfUrl?.trim() || null;

    const updated = await this.prisma.team.update({
      where: { id: team.id },
      data: {
        name: updateTeamDto.name.trim(),
        domain: updateTeamDto.domain.trim(),
        projectTitle: updateTeamDto.projectTitle.trim(),
        projectAbstract: updateTeamDto.projectAbstract.trim(),
        proposalPdfUrl,
      },
    });

    await this.proposalsService.syncProposalFromTeam(team.id);

    return updated;
  }

  async deleteTeam(leaderId: string) {
  const team = await this.prisma.team.findFirst({
    where: { leaderId },
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

async leaveTeam(authUserId: string) {
  const membership = await this.prisma.teamMember.findUnique({
    where: { authUserId },
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


}