import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateProposalDto } from './dto/create-proposal.dto';
import { ProposalsService } from './proposals.service';
import { Get, Query } from '@nestjs/common';
import { Param } from '@nestjs/common';
import { RequestSupervisorDto } from './dto/request-supervisor.dto';
import { InviteProposalDto } from './dto/invite-proposal.dto';

@Controller('proposals')
export class ProposalsController {
  constructor(
    private readonly proposalsService: ProposalsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createProposal(
    @Body()
    createProposalDto: CreateProposalDto,
  ) {
    return this.proposalsService.createProposal(
      createProposalDto,
    );
  }

  @UseGuards(JwtAuthGuard)
@Get('my-proposal')
getMyProposal(
  @Query('teamId') teamId: string,
) {
  return this.proposalsService.getMyProposal(
    teamId,
  );
}

@UseGuards(JwtAuthGuard)
@Post(':proposalId/request-supervisor')
requestSupervisor(
  @Param('proposalId')
  proposalId: string,

  @Body()
  requestSupervisorDto: RequestSupervisorDto,
) {
  return this.proposalsService.requestSupervisor(
    proposalId,
    requestSupervisorDto.supervisorId,
  );
}

@UseGuards(JwtAuthGuard)
@Get('supervisor/requests')
getSupervisorRequests(
  @Query('supervisorId')
  supervisorId: string,
) {
  return this.proposalsService.getSupervisorRequests(
    supervisorId,
  );
}
@UseGuards(JwtAuthGuard)
@Get('my-invitations')
getMyInvitations(
  @Query('proposalId')
  proposalId: string,
) {
  return this.proposalsService.getMyInvitations(
    proposalId,
  );
}

@UseGuards(JwtAuthGuard)
@Post('requests/:requestId/accept')
acceptRequest(
  @Param('requestId')
  requestId: string,
) {
  return this.proposalsService.acceptRequest(
    requestId,
  );
}

@UseGuards(JwtAuthGuard)
@Post('requests/:requestId/reject')
rejectRequest(
  @Param('requestId')
  requestId: string,
) {
  return this.proposalsService.rejectRequest(
    requestId,
  );
}

@UseGuards(JwtAuthGuard)
@Get()
getAllProposals() {
  return this.proposalsService.getAllProposals();
}

@UseGuards(JwtAuthGuard)
@Post(':proposalId/invite')
inviteProposal(
  @Param('proposalId')
  proposalId: string,

  @Body()
  dto: InviteProposalDto,
) {
  return this.proposalsService.inviteProposal(
    proposalId,
    dto.supervisorId,
  );
}

@UseGuards(JwtAuthGuard)
@Post('invitations/:invitationId/accept')
acceptInvitation(
  @Param('invitationId')
  invitationId: string,
) {
  return this.proposalsService.acceptInvitation(
    invitationId,
  );
}

@UseGuards(JwtAuthGuard)
@Post('invitations/:invitationId/reject')
rejectInvitation(
  @Param('invitationId')
  invitationId: string,
) {
  return this.proposalsService.rejectInvitation(
    invitationId,
  );
}

}