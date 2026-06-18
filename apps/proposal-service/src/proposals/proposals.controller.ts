import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InternalApiKeyGuard } from '../auth/guards/internal-api-key.guard';

import { CreateProposalDto } from './dto/create-proposal.dto';
import { ProposalsService } from './proposals.service';
import { RequestSupervisorDto } from './dto/request-supervisor.dto';
import { RejectProposalDto } from './dto/reject-proposal.dto';

@Controller('proposals')
export class ProposalsController {
  constructor(
    private readonly proposalsService: ProposalsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post()
  createProposal(
    @Req() req: any,
    @Headers('authorization') authorization: string,
    @Body() dto: CreateProposalDto,
  ) {
    return this.proposalsService.createProposal(
      req.user.userId,
      authorization,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('my-proposal')
  getMyProposal(
    @Headers('authorization') authorization: string,
  ) {
    return this.proposalsService.getMyProposal(
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post(':proposalId/request-supervisor')
  requestSupervisor(
    @Param('proposalId') proposalId: string,
    @Headers('authorization') authorization: string,
    @Body() requestSupervisorDto: RequestSupervisorDto,
  ) {
    return this.proposalsService.requestSupervisor(
      proposalId,
      requestSupervisorDto.supervisorId,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get('supervisor/requests')
  getSupervisorRequests(@Req() req: any) {
    return this.proposalsService.getSupervisorRequests(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('my-invitations')
  getMyInvitations(
    @Query('proposalId') proposalId: string,
    @Headers('authorization') authorization: string,
  ) {
    return this.proposalsService.getMyInvitations(
      proposalId,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Post('requests/:requestId/accept')
  acceptRequest(
    @Param('requestId') requestId: string,
    @Req() req: any,
  ) {
    return this.proposalsService.acceptRequest(
      requestId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Post('requests/:requestId/reject')
  rejectRequest(
    @Param('requestId') requestId: string,
    @Req() req: any,
  ) {
    return this.proposalsService.rejectRequest(
      requestId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get()
  getAllProposals() {
    return this.proposalsService.getAllProposals();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get('supervisor/invitations')
  getSupervisorInvitations(@Req() req: any) {
    return this.proposalsService.getSupervisorInvitations(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get('supervised')
  getSupervisedProposals(@Req() req: any) {
    return this.proposalsService.getSupervisedProposals(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Post(':proposalId/invite')
  inviteProposal(
    @Param('proposalId') proposalId: string,
    @Req() req: any,
  ) {
    return this.proposalsService.inviteProposal(
      proposalId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('invitations/:invitationId/accept')
  acceptInvitation(
    @Param('invitationId') invitationId: string,
    @Headers('authorization') authorization: string,
  ) {
    return this.proposalsService.acceptInvitation(
      invitationId,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('invitations/:invitationId/reject')
  rejectInvitation(
    @Param('invitationId') invitationId: string,
    @Headers('authorization') authorization: string,
  ) {
    return this.proposalsService.rejectInvitation(
      invitationId,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('all')
  getAllProposalsForCoordinator() {
    return this.proposalsService.getAllProposalsForCoordinator();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('stats')
  getProposalStats() {
    return this.proposalsService.getProposalStats();
  }

  @UseGuards(InternalApiKeyGuard)
  @Get('internal/team/:teamId')
  getProposalByTeamId(
    @Param('teamId') teamId: string,
  ) {
    return this.proposalsService.getProposalByTeamId(
      teamId,
    );
  }

  @UseGuards(InternalApiKeyGuard)
  @Get('supervised/:supervisorId')
  getSupervisedProposalsInternal(
    @Param('supervisorId') supervisorId: string,
  ) {
    return this.proposalsService.getSupervisedProposals(
      supervisorId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':proposalId')
  getProposalById(
    @Req() req: any,
    @Headers('authorization') authorization: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.proposalsService.getProposalById(
      proposalId,
      req.user.userId,
      req.user.role,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Patch(':proposalId/approve')
  approveProposal(
    @Param('proposalId') proposalId: string,
  ) {
    return this.proposalsService.approveProposal(
      proposalId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Patch(':proposalId/reject')
  rejectProposal(
    @Param('proposalId') proposalId: string,
    @Body() dto: RejectProposalDto,
  ) {
    return this.proposalsService.rejectProposal(
      proposalId,
      dto.reason,
    );
  }
}
