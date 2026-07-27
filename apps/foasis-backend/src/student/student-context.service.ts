import { Injectable } from '@nestjs/common';
import { Proposal, Team } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { getWorkspaceIdFromContext } from '../workspace/workspace-als';

export type StudentContext = {
  team: Team | null;
  proposal: Proposal | null;
  teamId: string | null;
  supervisorId: string | null;
};

const EMPTY_CONTEXT: StudentContext = {
  team: null,
  proposal: null,
  teamId: null,
  supervisorId: null,
};

@Injectable()
export class StudentContextService {
  constructor(private readonly prisma: PrismaService) {}

  async load(
    authUserId: string,
    workspaceId?: string,
  ): Promise<StudentContext> {
    const scopedWorkspaceId =
      workspaceId ?? getWorkspaceIdFromContext();

    const membership =
      await this.prisma.teamMember.findFirst({
        where: {
          authUserId,
          ...(scopedWorkspaceId
            ? { team: { workspaceId: scopedWorkspaceId } }
            : {}),
        },
        include: {
          team: {
            include: {
              proposal: true,
            },
          },
        },
      });

    if (!membership) {
      return EMPTY_CONTEXT;
    }

    const { proposal, ...team } = membership.team;

    return {
      team,
      proposal: proposal ?? null,
      teamId: membership.teamId,
      supervisorId:
        proposal?.assignedSupervisorId ?? null,
    };
  }
}
