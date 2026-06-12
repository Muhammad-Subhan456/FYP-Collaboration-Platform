import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProposalDto } from './dto/create-proposal.dto';

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createProposal(
    createProposalDto: CreateProposalDto,
  ) {
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
        title: createProposalDto.title,
        domain: createProposalDto.domain,
        abstract: createProposalDto.abstract,
        status: 'DRAFT',
      },
    });
  }

  async getMyProposal(teamId: string) {
  const proposal =
    await this.prisma.proposal.findUnique({
      where: {
        teamId,
      },
    });

  if (!proposal) {
    throw new BadRequestException(
      'Proposal not found',
    );
  }

  return proposal;
}

async requestSupervisor(
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
return {
  message:
    'Supervisor assigned successfully',
};

}

async rejectRequest(
  requestId: string,
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

  await this.prisma.supervisorRequest.update({
    where: {
      id: requestId,
    },
    data: {
      status: 'REJECTED',
    },
  });

  return {
    message:
      'Request rejected successfully',
  };
}

async getAllProposals() {
  return this.prisma.proposal.findMany({
    where: {
      status: {
        not: 'SUPERVISOR_ASSIGNED',
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

  return this.prisma.supervisorInvitation.create({
    data: {
      proposalId,
      supervisorId,
    },
  });
}

}