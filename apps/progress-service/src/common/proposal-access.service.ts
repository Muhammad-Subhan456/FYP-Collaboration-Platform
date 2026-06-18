import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProposalAccessService {
  constructor(
    private readonly httpService: HttpService,
  ) {}

  async getProposal(
    proposalId: string,
    authorization: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${process.env.PROPOSAL_SERVICE_URL}/proposals/${proposalId}`,
          { headers: { authorization } },
        ),
      );

      return response.data;
    } catch {
      throw new BadRequestException(
        'Proposal not found',
      );
    }
  }

  async assertSupervisorOwnsProposal(
    proposalId: string,
    supervisorId: string,
    authorization: string,
  ) {
    const proposal = await this.getProposal(
      proposalId,
      authorization,
    );

    if (proposal.assignedSupervisorId !== supervisorId) {
      throw new ForbiddenException(
        'You can only manage milestones for proposals you supervise',
      );
    }

    return proposal;
  }
}
