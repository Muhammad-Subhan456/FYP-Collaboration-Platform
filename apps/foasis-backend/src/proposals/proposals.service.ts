import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProposalDto } from './dto/create-proposal.dto';
import { TeamsService } from '../teams/teams.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { ActivityLogsService } from '../progress/activity-logs/activity-logs.service';
import { AuthContextService } from '../common/auth-context.service';
import { NotificationPayload } from '../common/helpers/notification-payload';

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly authContext: AuthContextService,
  ) {}

  private async getTeamIdForUser(
    authUserId: string,
  ): Promise<string> {
    const team =
      await this.teamsService.getMyTeam(authUserId);

    if (!team?.id) {
      throw new BadRequestException(
        'User does not belong to any team',
      );
    }

    return team.id;
  }

  private async getTeamIdFromAuth(
    authorization: string,
  ): Promise<string> {
    const authUserId =
      this.authContext.getUserIdFromAuthorization(
        authorization,
      );

    return this.getTeamIdForUser(authUserId);
  }

  private async getMyTeamForUser(authUserId: string) {
    return this.teamsService.getMyTeam(authUserId);
  }

  private async getMyTeam(authorization: string) {
    const authUserId =
      this.authContext.getUserIdFromAuthorization(
        authorization,
      );

    return this.getMyTeamForUser(authUserId);
  }

  private async assertTeamLeader(
    authUserId: string,
    authorization: string,
  ) {
    const team = await this.getMyTeam(authorization);

    if (!team?.id) {
      throw new BadRequestException(
        'User does not belong to any team',
      );
    }

    if (team.leaderId !== authUserId) {
      throw new ForbiddenException(
        'Only the team leader can respond to supervisor invitations',
      );
    }

    return team;
  }

  private async getTeamMemberIds(teamId: string) {
    try {
      const members =
        await this.teamsService.getTeamMembers(teamId);

      return members.map((member) => member.authUserId);
    } catch {
      return [];
    }
  }

  private async notifyTeamMembers(
    teamId: string,
    context: Omit<NotificationPayload, 'authUserId'>,
  ) {
    const memberIds = await this.getTeamMemberIds(teamId);

    await Promise.allSettled(
      memberIds.map((authUserId) =>
        this.notificationDispatch.send({
          authUserId,
          ...context,
        }),
      ),
    );
  }

  async getMyProposalByUserId(
    authUserId: string,
    teamId?: string | null,
  ) {
    const resolvedTeamId =
      teamId ??
      (await this.teamsService.getMyTeam(authUserId))
        ?.id;

    if (!resolvedTeamId) {
      return null;
    }

    return this.prisma.proposal.findUnique({
      where: { teamId: resolvedTeamId },
    });
  }

  async createProposal(
  authUserId: string,
  authorization: string,
  createProposalDto: CreateProposalDto,
) {
    const team = await this.teamsService.getMyTeam(
      authUserId,
    );

    if (!team?.id) {
      throw new BadRequestException(
        'User does not belong to any team',
      );
    }

    if (team.id !== createProposalDto.teamId) {
      throw new ForbiddenException(
        'You can only create a proposal for your own team',
      );
    }

    const existingProposal =
      await this.prisma.proposal.findUnique({
        where: {
          teamId: createProposalDto.teamId,
        },
      });

    if (existingProposal) {
      throw new BadRequestException(
        'Team already has a proposal',
      );
    }

    const proposal = await this.prisma.proposal.create({
      data: {
        teamId: createProposalDto.teamId,
        teamLeaderAuthUserId: authUserId,
        title: createProposalDto.title,
        domain: createProposalDto.domain,
        abstract: createProposalDto.abstract,
        status: 'DRAFT',
      },
    });

    await this.notifyTeamMembers(team.id, {
      title: 'Proposal Submitted',
      message: `Your team submitted the FYP proposal "${proposal.title}".`,
      type: 'PROPOSAL_SUBMITTED',
      entityType: 'PROPOSAL',
      entityId: proposal.id,
      route: '/student/proposal',
    });

    await this.activityLogsService.logActivity(
      authUserId,
      'Proposal Submitted',
      `Team "${team.name}" submitted proposal "${proposal.title}".`,
    );

    return proposal;
  }

  async getMyProposal(authorization: string) {
    try {
      const authUserId =
        this.authContext.getUserIdFromAuthorization(
          authorization,
        );

      return this.getMyProposalByUserId(authUserId);
    } catch {
      return null;
    }
  }

async requestSupervisor(
  proposalId: string,
  supervisorId: string,
  authorization: string,
) {
  const teamId =
    await this.getTeamIdFromAuth(
      authorization,
    );

  const proposal =
    await this.prisma.proposal.findUnique({
      where: {
        id: proposalId,
      },
    });

  if (!proposal) {
    throw new BadRequestException(
      'Proposal not found',
    );
  }

  if (proposal.teamId !== teamId) {
    throw new ForbiddenException(
      'You can only request supervisors for your own team proposal',
    );
  }

  if (
    proposal.status ===
    'SUPERVISOR_ASSIGNED'
  ) {
    throw new BadRequestException(
      'Supervisor already assigned',
    );
  }

  if (proposal.assignedSupervisorId) {
    throw new BadRequestException(
      'This team already has a supervisor',
    );
  }

  const existingRequest =
    await this.prisma.supervisorRequest.findUnique({
      where: {
        proposalId_supervisorId: {
          proposalId,
          supervisorId,
        },
      },
    });

  if (existingRequest) {
    throw new BadRequestException(
      'Request already sent',
    );
  }

  const request =
    await this.prisma.supervisorRequest.create({
      data: {
        proposalId,
        supervisorId,
      },
    });

  await this.prisma.proposal.update({
    where: {
      id: proposalId,
    },
    data: {
      status: 'PENDING_SUPERVISOR',
    },
  });

  await this.notificationDispatch.send({
    authUserId: supervisorId,
    title: 'Supervision Request Received',
    message: `A team has requested you to supervise their proposal "${proposal.title}".`,
    type: 'SUPERVISOR_REQUEST_RECEIVED',
    entityType: 'PROPOSAL',
    entityId: proposalId,
    route: '/supervisor/proposals',
  });

  await this.activityLogsService.logActivity(
    supervisorId,
    'Supervision Request Received',
    `A team requested supervision for "${proposal.title}".`,
  );

  return request;
}

async getSupervisorRequests(
  supervisorId: string,
) {
  return this.prisma.supervisorRequest.findMany({
    where: {
      supervisorId,
      status: 'PENDING',
    },
    include: {
      proposal: true,
    },
  });
}

async acceptRequest(
  requestId: string,
  supervisorId: string,
) {
  const request =
  await this.prisma.supervisorRequest.findUnique({
    where: {
      id: requestId,
    },
  });

if (!request) {
  throw new BadRequestException(
    'Request not found',
  );
}

if (request.supervisorId !== supervisorId) {
  throw new ForbiddenException(
    'You can only accept your own supervisor requests',
  );
}
const proposal =
  await this.prisma.proposal.findUnique({
    where: {
      id: request.proposalId,
    },
  });

if (!proposal) {
  throw new BadRequestException(
    'Proposal not found',
  );
}
if (
  proposal.status ===
  'SUPERVISOR_ASSIGNED'
) {
  throw new BadRequestException(
    'Supervisor already assigned',
  );
}
await this.prisma.proposal.update({
  where: {
    id: proposal.id,
  },
  data: {
    assignedSupervisorId:
      request.supervisorId,
    status:
      'SUPERVISOR_ASSIGNED',
  },
});
await this.prisma.supervisorRequest.update({
  where: {
    id: request.id,
  },
  data: {
    status: 'ACCEPTED',
  },
});
await this.prisma.supervisorRequest.updateMany({
  where: {
    proposalId: proposal.id,
    id: {
      not: request.id,
    },
  },
  data: {
    status: 'CANCELLED',
  },
});

// Create notification
if (proposal.teamLeaderAuthUserId) {
  await this.notificationDispatch.send({
    authUserId: proposal.teamLeaderAuthUserId,
    title: 'Supervisor Request Accepted',
    message:
      'A supervisor has accepted your proposal request.',
    type: 'SUPERVISOR_REQUEST_ACCEPTED',
    entityType: 'PROPOSAL',
    entityId: proposal.id,
    route: '/student/proposal',
  });
}

return {
  message:
    'Supervisor assigned successfully',
};

}

async rejectRequest(
  requestId: string,
  supervisorId: string,
) {
  const request =
    await this.prisma.supervisorRequest.findUnique({
      where: {
        id: requestId,
      },
    });

  if (!request) {
    throw new BadRequestException(
      'Request not found',
    );
  }

  if (request.supervisorId !== supervisorId) {
    throw new ForbiddenException(
      'You can only reject your own supervisor requests',
    );
  }

  await this.prisma.supervisorRequest.update({
    where: {
      id: requestId,
    },
    data: {
      status: 'REJECTED',
    },
  });

  const proposal =
  await this.prisma.proposal.findUnique({
    where: {
      id: request.proposalId,
    },
  });

if (
  proposal?.teamLeaderAuthUserId
) {
  await this.notificationDispatch.send({
    authUserId: proposal.teamLeaderAuthUserId,
    title: 'Supervisor Request Rejected',
    message:
      'A supervisor has rejected your proposal request.',
    type: 'SUPERVISOR_REQUEST_REJECTED',
    entityType: 'PROPOSAL',
    entityId: proposal.id,
    route: '/student/proposal',
  });
}

  return {
    message:
      'Request rejected successfully',
  };
}

async getAllProposals() {
  return this.prisma.proposal.findMany({
    where: {
      assignedSupervisorId: null,
      status: {
        in: ['DRAFT', 'PENDING_SUPERVISOR'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async inviteProposal(
  proposalId: string,
  supervisorId: string,
) {
  const proposal =
    await this.prisma.proposal.findUnique({
      where: {
        id: proposalId,
      },
    });

  if (!proposal) {
    throw new BadRequestException(
      'Proposal not found',
    );
  }

  if (
    proposal.status ===
    'SUPERVISOR_ASSIGNED'
  ) {
    throw new BadRequestException(
      'Supervisor already assigned',
    );
  }

  if (proposal.assignedSupervisorId) {
    throw new BadRequestException(
      'This team already has a supervisor',
    );
  }

  const existingInvitation =
    await this.prisma.supervisorInvitation.findUnique({
      where: {
        proposalId_supervisorId: {
          proposalId,
          supervisorId,
        },
      },
    });

  if (existingInvitation) {
    throw new BadRequestException(
      'Invitation already exists',
    );
  }

  const invitation = await this.prisma.supervisorInvitation.create({
    data: {
      proposalId,
      supervisorId,
    },
  });

  await this.notifyTeamMembers(proposal.teamId, {
    title: 'Supervisor Invitation Received',
    message: `A supervisor has invited your team "${proposal.title}" to collaborate.`,
    type: 'SUPERVISOR_INVITATION_RECEIVED',
    entityType: 'PROPOSAL',
    entityId: proposalId,
    route: '/student/proposal',
  });

  await this.activityLogsService.logActivity(
    supervisorId,
    'Supervisor Invitation Sent',
    `Invitation sent to team for proposal "${proposal.title}".`,
  );

  if (proposal.teamLeaderAuthUserId) {
    await this.activityLogsService.logActivity(
      proposal.teamLeaderAuthUserId,
      'Supervisor Invitation Received',
      `Your team received a supervision invitation for "${proposal.title}".`,
    );
  }

  return invitation;
}

async getTeamInvitations(authorization: string) {
  const teamId = await this.getTeamIdFromAuth(authorization);

  const proposal = await this.prisma.proposal.findUnique({
    where: { teamId },
  });

  if (!proposal) {
    return [];
  }

  return this.prisma.supervisorInvitation.findMany({
    where: { proposalId: proposal.id },
    include: { proposal: true },
    orderBy: { createdAt: 'desc' },
  });
}

async getTeamInvitationsByUserId(authUserId: string) {
  const team =
    await this.teamsService.getMyTeam(authUserId);

  if (!team?.id) {
    return [];
  }

  const proposal =
    await this.prisma.proposal.findUnique({
      where: { teamId: team.id },
    });

  if (!proposal) {
    return [];
  }

  return this.prisma.supervisorInvitation.findMany({
    where: { proposalId: proposal.id },
    orderBy: { createdAt: 'desc' },
  });
}

async getMyInvitations(
  proposalId: string,
  authorization: string,
) {
  if (!proposalId) {
    return this.getTeamInvitations(authorization);
  }

  const teamId =
    await this.getTeamIdFromAuth(
      authorization,
    );

  const proposal =
    await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });

  if (!proposal || proposal.teamId !== teamId) {
    throw new ForbiddenException(
      'You can only view invitations for your own team proposal',
    );
  }

  return this.prisma.supervisorInvitation.findMany({
    where: {
      proposalId,
    },
    include: { proposal: true },
    orderBy: { createdAt: 'desc' },
  });
}

async acceptInvitation(
  invitationId: string,
  authUserId: string,
  authorization: string,
) {
  const invitation =
  await this.prisma.supervisorInvitation.findUnique({
    where: {
      id: invitationId,
    },
  });

if (!invitation) {
  throw new BadRequestException(
    'Invitation not found',
  );
}

if (invitation.status !== 'PENDING') {
  throw new BadRequestException(
    'This invitation is no longer pending',
  );
}

const proposal =
  await this.prisma.proposal.findUnique({
    where: {
      id: invitation.proposalId,
    },
  });

if (!proposal) {
  throw new BadRequestException(
    'Proposal not found',
  );
}

const team = await this.assertTeamLeader(
  authUserId,
  authorization,
);

if (proposal.teamId !== team.id) {
  throw new ForbiddenException(
    'You can only accept invitations for your own team proposal',
  );
}
if (
  proposal.status ===
  'SUPERVISOR_ASSIGNED'
) {
  throw new BadRequestException(
    'Supervisor already assigned',
  );
}

if (proposal.assignedSupervisorId) {
  throw new BadRequestException(
    'This team already has a supervisor',
  );
}

await this.prisma.proposal.update({
  where: {
    id: proposal.id,
  },
  data: {
    assignedSupervisorId:
      invitation.supervisorId,
    status:
      'SUPERVISOR_ASSIGNED',
  },
});
await this.prisma.supervisorInvitation.update({
  where: {
    id: invitation.id,
  },
  data: {
    status: 'ACCEPTED',
  },
});

await this.prisma.supervisorInvitation.updateMany({
  where: {
    proposalId: proposal.id,
    id: {
      not: invitation.id,
    },
  },
  data: {
    status: 'CANCELLED',
  },
});
await this.prisma.supervisorRequest.updateMany({
  where: {
    proposalId: proposal.id,
  },
  data: {
    status: 'CANCELLED',
  },
});

await this.notificationDispatch.send({
  authUserId: invitation.supervisorId,
  title: 'Invitation Accepted',
  message:
    `${team.name} has accepted your supervision invitation.`,
  type: 'INVITATION_ACCEPTED',
  entityType: 'PROPOSAL',
  entityId: invitation.proposalId,
  route: '/supervisor/proposals',
});

await this.notifyTeamMembers(
  proposal.teamId,
  {
    title: 'Supervisor Assigned',
    message: `Your team is now supervised on "${proposal.title}".`,
    type: 'SUPERVISOR_REQUEST_ACCEPTED',
    entityType: 'PROPOSAL',
    entityId: proposal.id,
    route: '/student/proposal',
  },
);

await this.activityLogsService.logActivity(
  invitation.supervisorId,
  'Supervisor Invitation Accepted',
  `${team.name} accepted your invitation for "${proposal.title}".`,
);

await this.activityLogsService.logActivity(
  authUserId,
  'Supervisor Assignment Completed',
  `Your team accepted a supervision invitation for "${proposal.title}".`,
);

return {
  message:
    'Supervisor assigned successfully',
};
}

async rejectInvitation(
  invitationId: string,
  authUserId: string,
  authorization: string,
) {
  const invitation =
    await this.prisma.supervisorInvitation.findUnique({
      where: {
        id: invitationId,
      },
    });

  if (!invitation) {
    throw new BadRequestException(
      'Invitation not found',
    );
  }

  if (invitation.status !== 'PENDING') {
    throw new BadRequestException(
      'This invitation is no longer pending',
    );
  }

  const proposal =
    await this.prisma.proposal.findUnique({
      where: {
        id: invitation.proposalId,
      },
    });

  if (!proposal) {
    throw new BadRequestException(
      'Proposal not found',
    );
  }

  const team = await this.assertTeamLeader(
    authUserId,
    authorization,
  );

  if (proposal.teamId !== team.id) {
    throw new ForbiddenException(
      'You can only reject invitations for your own team proposal',
    );
  }

  await this.prisma.supervisorInvitation.update({
  where: {
    id: invitationId,
  },
  data: {
    status: 'REJECTED',
  },
});

await this.notificationDispatch.send({
  authUserId: invitation.supervisorId,
  title: 'Invitation Rejected',
  message:
    `${team.name} has declined your supervision invitation.`,
  type: 'INVITATION_REJECTED',
  entityType: 'PROPOSAL',
  entityId: invitation.proposalId,
  route: '/supervisor/invitations',
});

await this.activityLogsService.logActivity(
  invitation.supervisorId,
  'Supervisor Invitation Rejected',
  `${team.name} declined your invitation for "${proposal.title}".`,
);

await this.activityLogsService.logActivity(
  authUserId,
  'Supervisor Invitation Rejected',
  `You declined a supervision invitation for "${proposal.title}".`,
);

return {
  message:
    'Invitation rejected successfully',
};
}

async getAllProposalsForCoordinator() {
  return this.prisma.proposal.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async getProposalStats() {
  const [
    total,
    pending,
    approved,
    rejected,
    pendingSupervisor,
    supervisorAssigned,
  ] = await Promise.all([
    this.prisma.proposal.count(),
    this.prisma.proposal.count({
      where: { status: 'SUPERVISOR_ASSIGNED' },
    }),
    this.prisma.proposal.count({
      where: { status: 'APPROVED' },
    }),
    this.prisma.proposal.count({
      where: { status: 'REJECTED' },
    }),
    this.prisma.proposal.count({
      where: { status: 'PENDING_SUPERVISOR' },
    }),
    this.prisma.proposal.count({
      where: { status: 'SUPERVISOR_ASSIGNED' },
    }),
  ]);

  return {
    total,
    pending,
    approved,
    rejected,
    totalProposals: total,
    pendingProposals: pendingSupervisor,
    assignedProposals: supervisorAssigned,
  };
}

async getProposalById(
  proposalId: string,
  authUserId: string,
  role: string,
) {
  const proposal =
    await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });

  if (!proposal) {
    throw new BadRequestException(
      'Proposal not found',
    );
  }

  if (role === 'COORDINATOR') {
    return proposal;
  }

  if (role === 'SUPERVISOR') {
    if (proposal.assignedSupervisorId === authUserId) {
      return proposal;
    }

    throw new ForbiddenException('Access denied');
  }

  if (role === 'STUDENT') {
    const teamId =
      await this.getTeamIdForUser(authUserId);

    if (proposal.teamId === teamId) {
      return proposal;
    }

    throw new ForbiddenException('Access denied');
  }

  throw new ForbiddenException('Access denied');
}

async getProposalByTeamId(teamId: string) {
  return this.prisma.proposal.findUnique({
    where: { teamId },
  });
}

async getSupervisorInvitations(
  supervisorId: string,
) {
  return this.prisma.supervisorInvitation.findMany({
    where: { supervisorId },
    include: { proposal: true },
    orderBy: { createdAt: 'desc' },
  });
}

async getSupervisedProposals(supervisorId: string) {
  return this.prisma.proposal.findMany({
    where: {
      assignedSupervisorId: supervisorId,
      status: {
        in: ['SUPERVISOR_ASSIGNED', 'APPROVED'],
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async getSupervisorReviewQueue(supervisorId: string) {
  const [assigned, pendingRequests] = await Promise.all([
    this.prisma.proposal.findMany({
      where: {
        assignedSupervisorId: supervisorId,
        status: 'SUPERVISOR_ASSIGNED',
      },
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.supervisorRequest.findMany({
      where: {
        supervisorId,
        status: 'PENDING',
        proposal: {
          status: {
            in: ['DRAFT', 'PENDING_SUPERVISOR'],
          },
          assignedSupervisorId: null,
        },
      },
      include: { proposal: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const fromRequests = pendingRequests.map(
    (request) => request.proposal,
  );

  const seen = new Set<string>();
  const combined = [...assigned, ...fromRequests].filter(
    (proposal) => {
      if (seen.has(proposal.id)) {
        return false;
      }
      seen.add(proposal.id);
      return true;
    },
  );

  return combined;
}

async getSupervisorOverview(supervisorId: string) {
  const proposals = await this.prisma.proposal.findMany({
    where: { assignedSupervisorId: supervisorId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      domain: true,
      status: true,
      teamId: true,
      createdAt: true,
    },
  });

  return {
    supervisedProposals: proposals,
    activeCount: proposals.filter(
      (proposal) =>
        proposal.status === 'APPROVED' ||
        proposal.status === 'SUPERVISOR_ASSIGNED',
    ).length,
    approvedCount: proposals.filter(
      (proposal) => proposal.status === 'APPROVED',
    ).length,
    totalCount: proposals.length,
  };
}

private async assertSupervisorCanReviewProposal(
  proposalId: string,
  supervisorId: string,
) {
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new BadRequestException('Proposal not found');
  }

  if (
    proposal.assignedSupervisorId === supervisorId &&
    proposal.status === 'SUPERVISOR_ASSIGNED'
  ) {
    return proposal;
  }

  const pendingRequest =
    await this.prisma.supervisorRequest.findFirst({
      where: {
        proposalId,
        supervisorId,
        status: 'PENDING',
      },
    });

  if (
    pendingRequest &&
    !proposal.assignedSupervisorId &&
    (proposal.status === 'DRAFT' ||
      proposal.status === 'PENDING_SUPERVISOR')
  ) {
    return proposal;
  }

  throw new ForbiddenException(
    'You are not authorized to review this proposal',
  );
}

async resubmitProposal(
  authUserId: string,
  authorization: string,
  dto: {
    title: string;
    domain: string;
    abstract: string;
  },
) {
  await this.assertTeamLeader(authUserId, authorization);

  const teamId = await this.getTeamIdFromAuth(authorization);
  const proposal = await this.prisma.proposal.findUnique({
    where: { teamId },
  });

  if (!proposal) {
    throw new BadRequestException('Proposal not found');
  }

  if (proposal.status !== 'REJECTED') {
    throw new BadRequestException(
      'Only rejected proposals can be resubmitted',
    );
  }

  const updated = await this.prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      title: dto.title,
      domain: dto.domain,
      abstract: dto.abstract,
      status: 'DRAFT',
      reviewFeedback: null,
      reviewedAt: null,
      reviewedById: null,
      assignedSupervisorId: null,
    },
  });

  await this.notifyTeamMembers(proposal.teamId, {
    title: 'Proposal Revised',
    message: `Your team revised the proposal "${updated.title}" and it is ready for supervisor review.`,
    type: 'PROPOSAL_RESUBMITTED',
    entityType: 'PROPOSAL',
    entityId: updated.id,
    route: '/student/proposal',
  });

  await this.activityLogsService.logActivity(
    authUserId,
    'Proposal Resubmitted',
    `Revised proposal "${updated.title}" after supervisor feedback.`,
  );

  return updated;
}

async approveProposal(
  proposalId: string,
  supervisorId: string,
) {
  const proposal =
    await this.assertSupervisorCanReviewProposal(
      proposalId,
      supervisorId,
    );

  if (proposal.status === 'APPROVED') {
    throw new BadRequestException('Proposal is already approved');
  }

  const updated = await this.prisma.proposal.update({
    where: { id: proposalId },
    data: {
      assignedSupervisorId: supervisorId,
      status: 'APPROVED',
      reviewedAt: new Date(),
      reviewedById: supervisorId,
      reviewFeedback: null,
    },
  });

  await this.prisma.supervisorRequest.updateMany({
    where: {
      proposalId,
      supervisorId,
      status: 'PENDING',
    },
    data: { status: 'ACCEPTED' },
  });

  await this.prisma.supervisorRequest.updateMany({
    where: {
      proposalId,
      supervisorId: { not: supervisorId },
    },
    data: { status: 'CANCELLED' },
  });

  await this.prisma.supervisorInvitation.updateMany({
    where: { proposalId },
    data: { status: 'CANCELLED' },
  });

  await this.notifyTeamMembers(proposal.teamId, {
    title: 'Proposal Accepted',
    message: `Your FOASIS proposal "${proposal.title}" has been accepted by your supervisor.`,
    type: 'PROPOSAL_APPROVED',
    entityType: 'PROPOSAL',
    entityId: proposal.id,
    route: '/student/proposal',
  });

  await this.notificationDispatch.send({
    authUserId: supervisorId,
    title: 'Proposal Accepted',
    message: `You accepted the proposal "${proposal.title}" and are now assigned as supervisor.`,
    type: 'PROPOSAL_APPROVED',
    entityType: 'PROPOSAL',
    entityId: proposal.id,
    route: '/supervisor/teams',
  });

  await this.activityLogsService.logActivity(
    supervisorId,
    'Proposal Accepted',
    `Accepted proposal "${proposal.title}" and was assigned as supervisor.`,
  );

  await this.activityLogsService.logActivity(
    proposal.teamLeaderAuthUserId ?? supervisorId,
    'Supervisor Assigned',
    `A supervisor was assigned after proposal "${proposal.title}" was accepted.`,
  );

  return updated;
}

async rejectProposal(
  proposalId: string,
  supervisorId: string,
  reason: string,
) {
  const proposal =
    await this.assertSupervisorCanReviewProposal(
      proposalId,
      supervisorId,
    );

  if (!reason?.trim()) {
    throw new BadRequestException(
      'Review feedback is required when rejecting a proposal',
    );
  }

  const updated = await this.prisma.proposal.update({
    where: { id: proposalId },
    data: {
      status: 'REJECTED',
      reviewFeedback: reason.trim(),
      reviewedAt: new Date(),
      reviewedById: supervisorId,
      assignedSupervisorId: null,
    },
  });

  await this.prisma.supervisorRequest.updateMany({
    where: {
      proposalId,
      supervisorId,
      status: 'PENDING',
    },
    data: { status: 'REJECTED' },
  });

  await this.notifyTeamMembers(proposal.teamId, {
    title: 'Proposal Rejected',
    message: `Your proposal "${proposal.title}" was rejected. Feedback: ${reason.trim()}`,
    type: 'PROPOSAL_REJECTED',
    entityType: 'PROPOSAL',
    entityId: proposal.id,
    route: '/student/proposal',
  });

  await this.notificationDispatch.send({
    authUserId: supervisorId,
    title: 'Proposal Rejected',
    message: `You rejected the proposal "${proposal.title}".`,
    type: 'PROPOSAL_REJECTED',
    entityType: 'PROPOSAL',
    entityId: proposal.id,
    route: '/supervisor/proposals',
  });

  await this.activityLogsService.logActivity(
    supervisorId,
    'Proposal Rejected',
    `Rejected proposal "${proposal.title}" with review feedback.`,
  );

  return updated;
}

}