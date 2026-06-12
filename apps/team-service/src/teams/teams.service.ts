import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

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
          description:
            createTeamDto.description,
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
await this.prisma.joinRequest.update({
  where: {
    id: request.id,
  },
  data: {
    status: 'APPROVED',
  },
});
return {
  message:
    'Request approved successfully',
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
    });

  if (!membership) {
    throw new BadRequestException(
      'User does not belong to any team',
    );
  }

  return this.prisma.team.findUnique({
    where: {
      id: membership.teamId,
    },
  });
}

}