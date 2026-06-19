import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProposalDto } from './dto/create-proposal.dto';
import axios from 'axios';
import { buildNotification } from '../common/notification-payload';

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private notificationHeaders() {
    return {
      'X-Internal-Api-Key':
        process.env.INTERNAL_API_KEY,
    };
  }

  private async getTeamIdFromAuth(
    authorization: string,
  ): Promise<string> {
    const response = await axios.get(
      `${process.env.TEAM_SERVICE_URL}/teams/my-team`,
      {
        headers: { Authorization: authorization },
      },
    );

    const teamId = response.data?.id;

    if (!teamId) {
      throw new BadRequestException(
        'User does not belong to any team',
      );
    }

    return teamId;
  }

  async createProposal(
  authUserId: string,
  authorization: string,
  createProposalDto: CreateProposalDto,
) {
    const teamResponse = await axios.get(
      `${process.env.TEAM_SERVICE_URL}/teams/my-team`,
      {
        headers: { Authorization: authorization },
      },
    );

    const team = teamResponse.data;

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

    return this.prisma.proposal.create({
  data: {
    teamId: createProposalDto.teamId,

    teamLeaderAuthUserId: authUserId,

    title: createProposalDto.title,
    domain: createProposalDto.domain,
    abstract: createProposalDto.abstract,

    status: 'DRAFT',
  },
});
  }

  async getMyProposal(authorization: string) {
    let teamId: string;

    try {
      teamId = await this.getTeamIdFromAuth(authorization);
    } catch {
      return null;
    }

    const proposal = await this.prisma.proposal.findUnique({
      where: { teamId },
    });

    if (!proposal) {
      return null;
    }

    return proposal;
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
  try {
    await axios.post(
      `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
      buildNotification({
        authUserId:
          proposal.teamLeaderAuthUserId,

        title:
          'Supervisor Request Accepted',

        message:
          'A supervisor has accepted your proposal request.',
        type: 'SUPERVISOR_REQUEST_ACCEPTED',
        entityType: 'PROPOSAL',
        entityId: proposal.id,
        route: '/student/proposal',
      }),
      { headers: this.notificationHeaders() },
    );
  } catch (error) {
    console.error(
      'Failed to create notification',
    );
  }
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
  try {
    await axios.post(
      `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
      buildNotification({
        authUserId:
          proposal.teamLeaderAuthUserId,

        title:
          'Supervisor Request Rejected',

        message:
          'A supervisor has rejected your proposal request.',
        type: 'SUPERVISOR_REQUEST_REJECTED',
        entityType: 'PROPOSAL',
        entityId: proposal.id,
        route: '/student/proposal',
      }),
      { headers: this.notificationHeaders() },
    );
  } catch (error) {
    console.error(
      'Failed to create notification',
    );
  }
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

  if (proposal.teamLeaderAuthUserId) {
    try {
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
        buildNotification({
          authUserId: proposal.teamLeaderAuthUserId,
          title: 'Supervisor Invitation Received',
          message:
            'A supervisor has invited your team to collaborate on your proposal.',
          type: 'SUPERVISOR_INVITATION_RECEIVED',
          entityType: 'PROPOSAL',
          entityId: proposalId,
          route: '/student/proposal',
        }),
        { headers: this.notificationHeaders() },
      );
    } catch {
      // Non-blocking
    }
  }

  return invitation;
}

async getMyInvitations(
  proposalId: string,
  authorization: string,
) {
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
      status: 'PENDING',
    },
  });
}

async acceptInvitation(
  invitationId: string,
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

const teamId =
  await this.getTeamIdFromAuth(
    authorization,
  );

if (proposal.teamId !== teamId) {
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

try {
  await axios.post(
    `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
    buildNotification({
      authUserId:
        invitation.supervisorId,

      title:
        'Invitation Accepted',

      message:
        'A team has accepted your invitation.',
      type: 'INVITATION_ACCEPTED',
      entityType: 'PROPOSAL',
      entityId: invitation.proposalId,
      route: '/supervisor/proposals',
    }),
    { headers: this.notificationHeaders() },
  );
} catch (error) {
  console.error(
    'Failed to create notification',
  );
}

return {
  message:
    'Supervisor assigned successfully',
};
}

async rejectInvitation(
  invitationId: string,
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

  const teamId =
    await this.getTeamIdFromAuth(
      authorization,
    );

  if (proposal.teamId !== teamId) {
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

try {
  await axios.post(
    `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
    buildNotification({
      authUserId:
        invitation.supervisorId,

      title:
        'Invitation Rejected',

      message:
        'A team has rejected your invitation.',
      type: 'INVITATION_REJECTED',
      entityType: 'PROPOSAL',
      entityId: invitation.proposalId,
      route: '/supervisor/proposals',
    }),
    { headers: this.notificationHeaders() },
  );
} catch (error) {
  console.error(
    'Failed to create notification',
  );
}

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
  authorization: string,
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
      await this.getTeamIdFromAuth(
        authorization,
      );

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

async approveProposal(proposalId: string) {
  const proposal =
    await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });

  if (!proposal) {
    throw new BadRequestException(
      'Proposal not found',
    );
  }

  if (proposal.status !== 'SUPERVISOR_ASSIGNED') {
    throw new BadRequestException(
      'Only supervisor-assigned proposals can be approved',
    );
  }

  const updated =
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: 'APPROVED' },
    });

  if (proposal.teamLeaderAuthUserId) {
    try {
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
        buildNotification({
          authUserId:
            proposal.teamLeaderAuthUserId,
          title: 'Proposal Approved',
          message:
            'Your FOASIS proposal has been approved by the coordinator.',
          type: 'PROPOSAL_APPROVED',
          entityType: 'PROPOSAL',
          entityId: proposal.id,
          route: '/student/proposal',
        }),
        { headers: this.notificationHeaders() },
      );
    } catch {
      // Non-blocking
    }
  }

  return updated;
}

async rejectProposal(
  proposalId: string,
  reason?: string,
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

  if (
    proposal.status !== 'SUPERVISOR_ASSIGNED' &&
    proposal.status !== 'PENDING_SUPERVISOR'
  ) {
    throw new BadRequestException(
      'Proposal cannot be rejected in its current state',
    );
  }

  const updated =
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: 'REJECTED' },
    });

  if (proposal.teamLeaderAuthUserId) {
    try {
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
        buildNotification({
          authUserId:
            proposal.teamLeaderAuthUserId,
          title: 'Proposal Rejected',
          message:
            reason ??
            'Your FOASIS proposal has been rejected by the coordinator.',
          type: 'PROPOSAL_REJECTED',
          entityType: 'PROPOSAL',
          entityId: proposal.id,
          route: '/student/proposal',
        }),
        { headers: this.notificationHeaders() },
      );
    } catch {
      // Non-blocking
    }
  }

  return updated;
}

}