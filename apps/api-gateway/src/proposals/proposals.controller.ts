import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GatewayHttpService } from '../common/gateway-http.service';

@Controller('proposals')
export class ProposalsController {
  constructor(
    private readonly gatewayHttpService: GatewayHttpService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createProposal(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals`,
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-proposal')
  getMyProposal(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/my-proposal`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':proposalId/request-supervisor')
  requestSupervisor(
    @Headers('authorization') authorization: string,
    @Param('proposalId') proposalId: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/${proposalId}/request-supervisor`,
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('supervisor/requests')
  getSupervisorRequests(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/supervisor/requests`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-invitations')
  getMyInvitations(
    @Headers('authorization') authorization: string,
    @Query('proposalId') proposalId: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/my-invitations`,
      authorization,
      { proposalId },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('requests/:requestId/accept')
  acceptRequest(
    @Headers('authorization') authorization: string,
    @Param('requestId') requestId: string,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/requests/${requestId}/accept`,
      {},
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('requests/:requestId/reject')
  rejectRequest(
    @Headers('authorization') authorization: string,
    @Param('requestId') requestId: string,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/requests/${requestId}/reject`,
      {},
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getAllProposals(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':proposalId/invite')
  inviteProposal(
    @Headers('authorization') authorization: string,
    @Param('proposalId') proposalId: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/${proposalId}/invite`,
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations/:invitationId/accept')
  acceptInvitation(
    @Headers('authorization') authorization: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/invitations/${invitationId}/accept`,
      {},
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations/:invitationId/reject')
  rejectInvitation(
    @Headers('authorization') authorization: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/invitations/${invitationId}/reject`,
      {},
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  getAllProposalsForCoordinator(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/all`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getProposalStats(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/stats`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':proposalId')
  getProposalById(
    @Headers('authorization') authorization: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/${proposalId}`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':proposalId/approve')
  approveProposal(
    @Headers('authorization') authorization: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.gatewayHttpService.patch(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/${proposalId}/approve`,
      {},
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':proposalId/reject')
  rejectProposal(
    @Headers('authorization') authorization: string,
    @Param('proposalId') proposalId: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.patch(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/${proposalId}/reject`,
      body,
      authorization,
    );
  }
}
