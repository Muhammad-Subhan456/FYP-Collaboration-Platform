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

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';

import { CreateProposalDto } from './dto/create-proposal.dto';
import { ProposalsService } from './proposals.service';
import { RequestSupervisorDto } from './dto/request-supervisor.dto';
import { RejectProposalDto } from './dto/reject-proposal.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { ResubmitProposalDto } from './dto/resubmit-proposal.dto';

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
    @Body() dto: RejectRequestDto,
  ) {
    return this.proposalsService.rejectRequest(
      requestId,
      req.user.userId,
      dto.reason,
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
  @Post('teams/:teamId/invite')
  inviteTeam(
    @Param('teamId') teamId: string,
    @Req() req: any,
  ) {
    return this.proposalsService.inviteTeam(
      teamId,
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
    @Req() req: any,
    @Headers('authorization') authorization: string,
  ) {
    return this.proposalsService.acceptInvitation(
      invitationId,
      req.user.userId,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post('invitations/:invitationId/reject')
  rejectInvitation(
    @Param('invitationId') invitationId: string,
    @Req() req: any,
    @Headers('authorization') authorization: string,
  ) {
    return this.proposalsService.rejectInvitation(
      invitationId,
      req.user.userId,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Patch('my-proposal/resubmit')
  resubmitProposal(
    @Req() req: any,
    @Headers('authorization') authorization: string,
    @Body() dto: ResubmitProposalDto,
  ) {
    return this.proposalsService.resubmitProposal(
      req.user.userId,
      authorization,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get('supervisor/review-queue')
  getSupervisorReviewQueue(@Req() req: any) {
    return this.proposalsService.getSupervisorReviewQueue(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR', 'STUDENT', 'COORDINATOR')
  @Get('supervisor/:supervisorId/overview')
  getSupervisorOverview(
    @Param('supervisorId') supervisorId: string,
  ) {
    return this.proposalsService.getSupervisorOverview(
      supervisorId,
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
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Patch(':proposalId/approve')
  approveProposal(
    @Param('proposalId') proposalId: string,
    @Req() req: any,
  ) {
    return this.proposalsService.approveProposal(
      proposalId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Patch(':proposalId/reject')
  rejectProposal(
    @Param('proposalId') proposalId: string,
    @Req() req: any,
    @Body() dto: RejectProposalDto,
  ) {
    return this.proposalsService.rejectProposal(
      proposalId,
      req.user.userId,
      dto.reason,
    );
  }
}
