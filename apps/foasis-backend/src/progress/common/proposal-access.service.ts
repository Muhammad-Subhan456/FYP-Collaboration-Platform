import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { ProposalsService } from '../../proposals/proposals.service';

@Injectable()
export class ProposalAccessService {
  constructor(
    private readonly proposalsService: ProposalsService,
  ) {}

  async getProposal(
    proposalId: string,
    authUserId: string,
    role: string,
  ) {
    try {
      return await this.proposalsService.getProposalById(
        proposalId,
        authUserId,
        role,
      );
    } catch {
      throw new BadRequestException(
        'Proposal not found',
      );
    }
  }

  async assertSupervisorOwnsProposal(
    proposalId: string,
    supervisorId: string,
    authUserId: string,
    role: string,
  ) {
    const proposal = await this.getProposal(
      proposalId,
      authUserId,
      role,
    );

    if (proposal.assignedSupervisorId !== supervisorId) {
      throw new ForbiddenException(
        'You can only manage milestones for proposals you supervise',
      );
    }

    return proposal;
  }
}
