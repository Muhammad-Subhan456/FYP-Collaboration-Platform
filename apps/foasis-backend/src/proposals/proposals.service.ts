import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProposalDto } from './dto/create-proposal.dto';
import { TeamsService } from '../teams/teams.service';
import {
  getTeamProfileSnapshot,
  isTeamProfileComplete,
} from '../teams/team-profile.util';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { ActivityLogsService } from '../progress/activity-logs/activity-logs.service';
import { AuthContextService } from '../common/auth-context.service';
import { AppUrlsService } from '../common/app-urls.service';
import { NotificationPayload } from '../common/helpers/notification-payload';
import { DomainEvents } from '../domain-events/domain-event.constants';
import { DomainEventService } from '../domain-events/domain-event.service';
import { EmailService } from '../email/email.service';
import {
  buildProposalAcceptedEmail,
  buildProposalRequestEmail,
} from '../email/email.templates';
import type {
  DomainEventScope,
  ProposalInterestDismissedPayload,
  ProposalInterestPayload,
  ProposalSnapshotPayload,
  ProposalSubmittedPayload,
} from '../domain-events/domain-event.types';
import {
  serializeProposal,
  serializeSupervisorInvitation,
  serializeSupervisorRequest,
} from './proposals-realtime';
import {
  InvitationBrowseTarget,
  SUPERVISOR_MAX_ACCEPTED_TEAMS,
  TeamAvailability,
} from './supervisor-capacity.constants';

@Injectable()
export class ProposalsService {
  private static readonly REQUEST_TTL_MS = 5 * 60 * 1000;
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly authContext: AuthContextService,
    private readonly domainEventService: DomainEventService,
    private readonly emailService: EmailService,
    private readonly appUrls: AppUrlsService,
  ) {}

  async getAcceptedTeamCount(supervisorId: string) {
    return this.prisma.proposal.count({
      where: {
        assignedSupervisorId: supervisorId,
        status: {
          in: ['SUPERVISOR_ASSIGNED', 'APPROVED'],
        },
      },
    });
  }

  async isSupervisorAtCapacity(supervisorId: string) {
    const count = await this.getAcceptedTeamCount(supervisorId);
    return count >= SUPERVISOR_MAX_ACCEPTED_TEAMS;
  }

  async enforceSupervisorCapacity(supervisorId: string) {
    const count = await this.getAcceptedTeamCount(supervisorId);

    if (count < SUPERVISOR_MAX_ACCEPTED_TEAMS) {
      return { enforced: false, rejectedRequests: 0, rejectedInvitations: 0 };
    }

    const now = new Date();
    const reason =
      'Supervisor has reached the maximum supervised team capacity';

    const pendingRequests =
      await this.prisma.supervisorRequest.findMany({
        where: {
          supervisorId,
          status: 'PENDING',
        },
        include: {
          proposal: {
            select: {
              id: true,
              title: true,
              teamLeaderAuthUserId: true,
            },
          },
        },
      });

    await Promise.all(
      pendingRequests.map(async (request) => {
        await this.prisma.supervisorRequest.update({
          where: { id: request.id },
          data: {
            status: 'REJECTED',
            rejectionReason: reason,
            resolvedAt: now,
          },
        });

        await this.resetProposalAfterPendingEnd(request.proposalId);

        if (request.proposal?.teamLeaderAuthUserId) {
          await this.notificationDispatch.send({
            authUserId: request.proposal.teamLeaderAuthUserId,
            title: 'Supervision Request Declined',
            message: reason,
            type: 'SUPERVISOR_REQUEST_REJECTED',
            entityType: 'PROPOSAL',
            entityId: request.proposal.id,
            route: '/student/proposal',
          });
        }
      }),
    );

    const rejectedInvitations =
      await this.prisma.supervisorInvitation.updateMany({
        where: {
          supervisorId,
          status: 'PENDING',
        },
        data: {
          status: 'REJECTED',
        },
      });

    return {
      enforced: true,
      rejectedRequests: pendingRequests.length,
      rejectedInvitations: rejectedInvitations.count,
    };
  }

  private isProposalInviteEligible(
    proposalStatus: string | null,
    hasPendingSupervisorRequest: boolean,
  ): boolean {
    if (hasPendingSupervisorRequest) {
      return false;
    }

    if (!proposalStatus) {
      return true;
    }

    if (
      proposalStatus === 'SUPERVISOR_ASSIGNED' ||
      proposalStatus === 'APPROVED' ||
      proposalStatus === 'PENDING_SUPERVISOR'
    ) {
      return false;
    }

    return (
      proposalStatus === 'DRAFT' || proposalStatus === 'REJECTED'
    );
  }

  private buildBrowseAvailability(
    canInvite: boolean,
  ): TeamAvailability {
    return canInvite ? 'AVAILABLE' : 'UNAVAILABLE';
  }

  private async getWorkspaceCoordinatorIds(workspaceId: string) {
    const memberships =
      await this.prisma.workspaceMembership.findMany({
        where: {
          workspaceId,
          role: 'COORDINATOR',
          isActive: true,
        },
        select: { userId: true },
      });

    return memberships.map((membership) => membership.userId);
  }

  async getInvitationBrowseTargets(
    supervisorId: string,
    workspaceId: string,
  ): Promise<InvitationBrowseTarget[]> {
    const atCapacity =
      await this.isSupervisorAtCapacity(supervisorId);

    const [
      teamsWithoutProposal,
      proposals,
      pendingRequests,
      invitations,
    ] = await Promise.all([
      this.prisma.team.findMany({
        where: {
          workspaceId,
          isOpen: true,
          proposal: null,
        },
        select: {
          id: true,
          name: true,
          domain: true,
          leaderId: true,
          projectTitle: true,
          projectAbstract: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.proposal.findMany({
        where: {
          workspaceId,
          assignedSupervisorId: null,
          status: {
            notIn: ['SUPERVISOR_ASSIGNED', 'APPROVED'],
          },
        },
        select: {
          id: true,
          teamId: true,
          title: true,
          domain: true,
          abstract: true,
          status: true,
          teamLeaderAuthUserId: true,
          team: {
            select: {
              name: true,
              domain: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supervisorRequest.findMany({
        where: { workspaceId, status: 'PENDING' },
        select: { proposalId: true },
      }),
      this.prisma.supervisorInvitation.findMany({
        where: { workspaceId, supervisorId },
        select: {
          proposalId: true,
          teamId: true,
          status: true,
        },
      }),
    ]);

    const pendingProposalIds = new Set(
      pendingRequests.map((request) => request.proposalId),
    );

    const sentProposalIds = new Set(
      invitations
        .filter(
          (invitation) =>
            invitation.proposalId &&
            (invitation.status === 'PENDING' ||
              invitation.status === 'ACCEPTED'),
        )
        .map((invitation) => invitation.proposalId!),
    );

    const sentTeamIds = new Set(
      invitations
        .filter(
          (invitation) =>
            invitation.teamId &&
            (invitation.status === 'PENDING' ||
              invitation.status === 'ACCEPTED'),
        )
        .map((invitation) => invitation.teamId!),
    );

    const items: InvitationBrowseTarget[] = [];

    for (const team of teamsWithoutProposal) {
      const invitationSent = sentTeamIds.has(team.id);
      const canInvite =
        !atCapacity &&
        !invitationSent &&
        this.isProposalInviteEligible(null, false);

      items.push({
        inviteKey: `team:${team.id}`,
        kind: 'team',
        teamId: team.id,
        proposalId: null,
        teamName: team.name,
        domain: team.domain,
        title: team.projectTitle,
        abstract: team.projectAbstract,
        teamLeaderAuthUserId: team.leaderId,
        availability: this.buildBrowseAvailability(canInvite),
        canInvite,
        invitationSent,
      });
    }

    for (const proposal of proposals) {
      const invitationSent = sentProposalIds.has(proposal.id);
      const hasPendingRequest = pendingProposalIds.has(proposal.id);
      const canInvite =
        !atCapacity &&
        !invitationSent &&
        this.isProposalInviteEligible(
          proposal.status,
          hasPendingRequest,
        );

      items.push({
        inviteKey: `proposal:${proposal.id}`,
        kind: 'proposal',
        teamId: proposal.teamId,
        proposalId: proposal.id,
        teamName: proposal.team.name,
        domain: proposal.domain,
        title: proposal.title,
        abstract: proposal.abstract,
        teamLeaderAuthUserId: proposal.teamLeaderAuthUserId,
        availability: this.buildBrowseAvailability(canInvite),
        canInvite,
        invitationSent,
      });
    }

    return items;
  }

  private async getTeamIdForUser(
    authUserId: string,
  ): Promise<string> {
    const team =
      await this.teamsService.getMyTeam(authUserId);

    if (!team?.id) {
      throw new BadRequestException(
        'User does not belong to any team',
      );
    }

    return team.id;
  }

  private async getTeamIdFromAuth(
    authorization: string,
  ): Promise<string> {
    const authUserId =
      this.authContext.getUserIdFromAuthorization(
        authorization,
      );

    return this.getTeamIdForUser(authUserId);
  }

  private async getMyTeamForUser(authUserId: string) {
    return this.teamsService.getMyTeam(authUserId);
  }

  private async getMyTeam(authorization: string) {
    const authUserId =
      this.authContext.getUserIdFromAuthorization(
        authorization,
      );

    return this.getMyTeamForUser(authUserId);
  }

  private async assertTeamLeader(
    authUserId: string,
    authorization: string,
  ) {
    const team = await this.getMyTeam(authorization);

    if (!team?.id) {
      throw new BadRequestException(
        'User does not belong to any team',
      );
    }

    if (team.leaderId !== authUserId) {
      throw new ForbiddenException(
        'Only the team leader can respond to supervisor invitations',
      );
    }

    return team;
  }

  async syncProposalFromTeam(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return;
    }

    const proposal = await this.prisma.proposal.findUnique({
      where: { teamId },
    });

    if (!proposal) {
      return;
    }

    if (
      proposal.status === 'SUPERVISOR_ASSIGNED' ||
      proposal.status === 'APPROVED'
    ) {
      return;
    }

    const snapshot = getTeamProfileSnapshot(team);
    const wasResettable =
      proposal.status === 'REJECTED' || proposal.status === 'IGNORED';

    await this.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        title: snapshot.title || proposal.title,
        domain: snapshot.domain,
        abstract: snapshot.abstract || proposal.abstract,
        proposalPdfUrl: snapshot.proposalPdfUrl,
        ...(wasResettable
          ? {
              status: 'DRAFT',
              reviewFeedback: null,
              reviewedAt: null,
              reviewedById: null,
              assignedSupervisorId: null,
              pendingSupervisorId: null,
              pendingExpiresAt: null,
            }
          : {}),
      },
    });
  }

  async ensureProposalForTeam(teamId: string, leaderId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    if (team.leaderId !== leaderId) {
      throw new ForbiddenException(
        'Only the team leader can manage the proposal',
      );
    }

    if (await this.teamsService.isTeamWorkflowLocked(teamId)) {
      throw new BadRequestException('Proposal workflow is locked');
    }

    if (!isTeamProfileComplete(team)) {
      throw new BadRequestException(
        'Complete your team profile before sending a proposal',
      );
    }

    const snapshot = getTeamProfileSnapshot(team);
    const existing = await this.prisma.proposal.findUnique({
      where: { teamId },
    });

    if (existing) {
      await this.syncProposalFromTeam(teamId);
      return this.prisma.proposal.findUniqueOrThrow({
        where: { teamId },
      });
    }

    const proposal = await this.prisma.proposal.create({
      data: {
        teamId,
        workspaceId: team.workspaceId,
        teamLeaderAuthUserId: leaderId,
        title: snapshot.title,
        domain: snapshot.domain,
        abstract: snapshot.abstract,
        proposalPdfUrl: snapshot.proposalPdfUrl!,
        status: 'DRAFT',
      },
    });

    await this.prisma.supervisorInvitation.updateMany({
      where: {
        teamId,
        proposalId: null,
        status: 'PENDING',
      },
      data: { proposalId: proposal.id },
    });

    await this.notifyTeamMembers(teamId, {
      title: 'Proposal Ready',
      message: `Your team proposal "${proposal.title}" is ready to send to supervisors.`,
      type: 'PROPOSAL_CREATED',
      entityType: 'PROPOSAL',
      entityId: proposal.id,
      route: '/student/proposal',
    });

    return proposal;
  }

  private async resetProposalAfterPendingEnd(
    proposalId: string,
    nextStatus: 'DRAFT' | 'IGNORED' = 'DRAFT',
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        assignedSupervisorId: true,
        status: true,
      },
    });

    if (
      !proposal ||
      proposal.assignedSupervisorId ||
      proposal.status === 'SUPERVISOR_ASSIGNED' ||
      proposal.status === 'APPROVED'
    ) {
      return;
    }

    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: nextStatus,
        pendingSupervisorId: null,
        pendingExpiresAt: null,
      },
    });
  }

  async expirePendingSupervisorRequests() {
    const now = new Date();

    const expired = await this.prisma.proposal.findMany({
      where: {
        status: 'PENDING_SUPERVISOR',
        pendingExpiresAt: { lte: now },
      },
      select: {
        id: true,
        title: true,
        teamLeaderAuthUserId: true,
        teamId: true,
      },
    });

    if (expired.length === 0) {
      return { expired: 0 };
    }

    await Promise.all(
      expired.map(async (proposal) => {
        await this.prisma.$transaction(async (tx) => {
          const updated = await tx.proposal.updateMany({
            where: {
              id: proposal.id,
              status: 'PENDING_SUPERVISOR',
              pendingExpiresAt: { lte: now },
            },
            data: {
              status: 'IGNORED',
              pendingSupervisorId: null,
              pendingExpiresAt: null,
            },
          });

          if (updated.count === 0) {
            return;
          }

          await tx.supervisorRequest.updateMany({
            where: {
              proposalId: proposal.id,
              status: 'PENDING',
            },
            data: {
              status: 'IGNORED',
              resolvedAt: now,
            },
          });
        });

        if (proposal.teamLeaderAuthUserId) {
          await this.notificationDispatch.send({
            authUserId: proposal.teamLeaderAuthUserId,
            title: 'Proposal Ignored',
            message: `Your proposal "${proposal.title}" expired without a supervisor response. You may submit to another supervisor.`,
            type: 'PROPOSAL_IGNORED',
            entityType: 'PROPOSAL',
            entityId: proposal.id,
            route: '/student/proposal',
          });
        }
      }),
    );

    return { expired: expired.length };
  }

  async getRequestHistoryForProposal(proposalId: string) {
    return this.prisma.supervisorRequest.findMany({
      where: { proposalId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getTeamMemberIds(teamId: string) {
    try {
      const members =
        await this.teamsService.getTeamMembers(teamId);

      return members.map((member) => member.authUserId);
    } catch {
      return [];
    }
  }

  private async notifyTeamMembers(
    teamId: string,
    context: Omit<NotificationPayload, 'authUserId'>,
  ) {
    const memberIds = await this.getTeamMemberIds(teamId);

    await Promise.allSettled(
      memberIds.map((authUserId) =>
        this.notificationDispatch.send({
          authUserId,
          ...context,
        }),
      ),
    );
  }

  async getMyProposalByUserId(
    authUserId: string,
    teamId?: string | null,
  ) {
    const resolvedTeamId =
      teamId ??
      (await this.teamsService.getMyTeam(authUserId))
        ?.id;

    if (!resolvedTeamId) {
      return null;
    }

    return this.prisma.proposal.findUnique({
      where: { teamId: resolvedTeamId },
    });
  }

  async createProposal(
  authUserId: string,
  authorization: string,
  createProposalDto: CreateProposalDto,
) {
    const team = await this.teamsService.getMyTeam(
      authUserId,
    );

    if (!team?.id) {
      throw new BadRequestException(
        'User does not belong to any team',
      );
    }

    if (team.leaderId !== authUserId) {
      throw new ForbiddenException(
        'Only the team leader can create a proposal',
      );
    }

    if (team.id !== createProposalDto.teamId) {
      throw new ForbiddenException(
        'You can only create a proposal for your own team',
      );
    }

    return this.ensureProposalForTeam(team.id, authUserId);
  }

  async getMyProposal(authorization: string) {
    try {
      const authUserId =
        this.authContext.getUserIdFromAuthorization(
          authorization,
        );

      return this.getMyProposalByUserId(authUserId);
    } catch {
      return null;
    }
  }

async requestSupervisorForMyTeam(
  supervisorId: string,
  authorization: string,
) {
  return this.submitProposalToSupervisor(
    supervisorId,
    authorization,
  );
}

async submitProposalToSupervisor(
  supervisorId: string,
  authorization: string,
) {
  const authUserId =
    this.authContext.getUserIdFromAuthorization(authorization);

  await this.assertTeamLeader(authUserId, authorization);

  const teamId = await this.getTeamIdFromAuth(authorization);

  if (await this.teamsService.isTeamWorkflowLocked(teamId)) {
    throw new BadRequestException('Proposal workflow is locked');
  }

  const team = await this.prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team || !isTeamProfileComplete(team)) {
    throw new BadRequestException(
      'Complete your team profile before submitting a proposal',
    );
  }

  await this.expirePendingSupervisorRequests();

  let proposal = await this.ensureProposalForTeam(teamId, authUserId);
  await this.syncProposalFromTeam(teamId);
  proposal = await this.prisma.proposal.findUniqueOrThrow({
    where: { id: proposal.id },
  });

  if (!proposal.proposalPdfUrl) {
    throw new BadRequestException(
      'Upload a proposal PDF on your team page before submitting',
    );
  }

  const expiresAt = new Date(
    Date.now() + ProposalsService.REQUEST_TTL_MS,
  );

  const result = await this.prisma.$transaction(async (tx) => {
    const locked = await tx.proposal.updateMany({
      where: {
        id: proposal.id,
        teamId,
        assignedSupervisorId: null,
        status: {
          in: ['DRAFT', 'REJECTED', 'IGNORED'],
        },
      },
      data: {
        status: 'PENDING_SUPERVISOR',
        pendingSupervisorId: supervisorId,
        pendingExpiresAt: expiresAt,
        reviewFeedback: null,
        reviewedAt: null,
        reviewedById: null,
      },
    });

    if (locked.count === 0) {
      throw new BadRequestException(
        'A proposal is already pending or this team already has a supervisor',
      );
    }

    const request = await tx.supervisorRequest.create({
      data: {
        proposalId: proposal.id,
        workspaceId: proposal.workspaceId,
        supervisorId,
        expiresAt,
      },
    });

    return request;
  });

  await this.notificationDispatch.send({
    authUserId: supervisorId,
    title: 'New Proposal Received',
    message: `A team submitted proposal "${proposal.title}" for your review. Respond within 5 minutes.`,
    type: 'PROPOSAL_RECEIVED',
    entityType: 'PROPOSAL',
    entityId: proposal.id,
    route: '/supervisor/requests',
  });

  void this.emailSupervisorProposalRequest({
    supervisorId,
    teamId,
    proposalTitle: proposal.title,
    workspaceId: proposal.workspaceId,
    leaderAuthUserId: authUserId,
  }).catch((error) => {
    this.logger.warn(
      `Failed to send proposal-request email for ${proposal.id}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  });

  await this.activityLogsService.logActivity(
    supervisorId,
    'Proposal Received',
    `A team submitted proposal "${proposal.title}" for review.`,
  );

  const updatedProposal = await this.prisma.proposal.findUniqueOrThrow({
    where: { id: proposal.id },
  });

  const submittedPayload: ProposalSubmittedPayload = {
    teamId,
    proposal: serializeProposal(updatedProposal),
    request: serializeSupervisorRequest(result),
  };

  this.publishProposalEvent(
    DomainEvents.PROPOSAL_SUBMITTED,
    authUserId,
    { type: 'team', id: teamId },
    submittedPayload,
    proposal.id,
  );
  this.publishProposalEvent(
    DomainEvents.PROPOSAL_SUBMITTED,
    authUserId,
    { type: 'supervisor', id: supervisorId },
    submittedPayload,
    proposal.id,
  );

  return result;
}

async requestSupervisor(
  proposalId: string,
  supervisorId: string,
  authorization: string,
) {
  const authUserId =
    this.authContext.getUserIdFromAuthorization(authorization);

  const teamId = await this.getTeamIdFromAuth(authorization);
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId },
  });

  if (!proposal || proposal.teamId !== teamId) {
    throw new ForbiddenException(
      'You can only submit proposals for your own team',
    );
  }

  await this.assertTeamLeader(authUserId, authorization);

  return this.submitProposalToSupervisor(supervisorId, authorization);
}

async getSupervisorRequests(
  supervisorId: string,
) {
  await this.expirePendingSupervisorRequests();

  return this.prisma.proposal.findMany({
    where: {
      pendingSupervisorId: supervisorId,
      status: 'PENDING_SUPERVISOR',
      OR: [
        { pendingExpiresAt: null },
        { pendingExpiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
}

async acceptRequest(
  requestId: string,
  supervisorId: string,
) {
  const request = await this.prisma.supervisorRequest.findUnique({
    where: { id: requestId },
    include: { proposal: true },
  });

  if (!request) {
    throw new BadRequestException('Request not found');
  }

  if (request.supervisorId !== supervisorId) {
    throw new ForbiddenException(
      'You can only accept proposals assigned to you',
    );
  }

  return this.approveProposal(request.proposalId, supervisorId);
}

async rejectRequest(
  requestId: string,
  supervisorId: string,
  reason: string,
) {
  const request = await this.prisma.supervisorRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new BadRequestException('Request not found');
  }

  if (request.supervisorId !== supervisorId) {
    throw new ForbiddenException(
      'You can only reject proposals assigned to you',
    );
  }

  return this.rejectProposal(request.proposalId, supervisorId, reason);
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

async expressInterest(
  teamId: string,
  supervisorId: string,
) {
  if (await this.isSupervisorAtCapacity(supervisorId)) {
    throw new BadRequestException(
      'You have reached the maximum of 3 accepted teams',
    );
  }

  const team = await this.prisma.team.findUnique({
    where: { id: teamId },
    include: { proposal: true },
  });

  if (!team) {
    throw new BadRequestException('Team not found');
  }

  if (!team.isOpen) {
    throw new BadRequestException('Team is not active');
  }

  if (await this.teamsService.isTeamWorkflowLocked(teamId)) {
    throw new BadRequestException(
      'This team already has an accepted proposal',
    );
  }

  if (team.proposal?.assignedSupervisorId === supervisorId) {
    throw new BadRequestException(
      'You are already supervising this team',
    );
  }

  const existingInterest =
    await this.prisma.supervisorInvitation.findFirst({
      where: {
        supervisorId,
        OR: [
          { teamId },
          ...(team.proposal?.id
            ? [{ proposalId: team.proposal.id }]
            : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

  if (existingInterest?.status === 'PENDING') {
    throw new BadRequestException(
      'You have already expressed interest in this team',
    );
  }

  if (existingInterest?.status === 'ACCEPTED') {
    throw new BadRequestException(
      'You are already supervising this team',
    );
  }

  let invitation;

  if (
    existingInterest &&
    (existingInterest.status === 'IGNORED' ||
      existingInterest.status === 'REJECTED' ||
      existingInterest.status === 'CANCELLED')
  ) {
    invitation = await this.prisma.supervisorInvitation.update({
      where: { id: existingInterest.id },
      data: {
        status: 'PENDING',
        teamId,
        proposalId: team.proposal?.id ?? null,
      },
    });
  } else {
    invitation = await this.prisma.supervisorInvitation.create({
      data: {
        workspaceId: team.workspaceId,
        teamId,
        supervisorId,
        proposalId: team.proposal?.id ?? null,
      },
    });
  }

  const supervisorProfile =
    await this.prisma.userProfile.findFirst({
      where: { authUserId: supervisorId },
      select: { fullName: true, designation: true },
    });

  const supervisorLabel =
    supervisorProfile?.fullName ?? 'A supervisor';

  await this.notificationDispatch.send({
    authUserId: team.leaderId,
    title: 'Supervisor Expressed Interest',
    message: `${supervisorLabel} is interested in supervising your project.`,
    type: 'SUPERVISOR_INTEREST_RECEIVED',
    entityType: 'TEAM',
    entityId: teamId,
    route: '/student/proposal',
  });

  await this.activityLogsService.logActivity(
    supervisorId,
    'Interest Expressed',
    `Expressed interest in team "${team.name}".`,
  );

  const interestPayload: ProposalInterestPayload = {
    teamId,
    invitation: serializeSupervisorInvitation(invitation),
  };

  this.publishProposalEvent(
    DomainEvents.PROPOSAL_INTEREST_RECEIVED,
    supervisorId,
    { type: 'team', id: teamId },
    interestPayload,
    invitation.id,
  );
  this.publishProposalEvent(
    DomainEvents.PROPOSAL_INTEREST_RECEIVED,
    supervisorId,
    { type: 'supervisor', id: supervisorId },
    interestPayload,
    invitation.id,
  );

  return invitation;
}

async inviteProposal(
  proposalId: string,
  supervisorId: string,
) {
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new BadRequestException('Proposal not found');
  }

  return this.expressInterest(proposal.teamId, supervisorId);
}

async inviteTeam(
  teamId: string,
  supervisorId: string,
) {
  return this.expressInterest(teamId, supervisorId);
}

async getTeamInvitations(authorization: string) {
  const teamId = await this.getTeamIdFromAuth(authorization);

  const proposal = await this.prisma.proposal.findUnique({
    where: { teamId },
  });

  if (!proposal) {
    return [];
  }

  return this.prisma.supervisorInvitation.findMany({
    where: { proposalId: proposal.id },
    include: { proposal: true },
    orderBy: { createdAt: 'desc' },
  });
}

async getTeamInvitationsByUserId(authUserId: string) {
  const team =
    await this.teamsService.getMyTeam(authUserId);

  if (!team?.id) {
    return [];
  }

  const proposal =
    await this.prisma.proposal.findUnique({
      where: { teamId: team.id },
    });

  return this.prisma.supervisorInvitation.findMany({
    where: {
      OR: [
        ...(proposal ? [{ proposalId: proposal.id }] : []),
        { teamId: team.id },
      ],
      status: 'PENDING',
    },
    include: { proposal: true },
    orderBy: { createdAt: 'desc' },
  });
}

async getMyInvitations(
  proposalId: string,
  authorization: string,
) {
  if (!proposalId) {
    return this.getTeamInvitations(authorization);
  }

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
    },
    include: { proposal: true },
    orderBy: { createdAt: 'desc' },
  });
}

async acceptInvitation(
  _invitationId: string,
  _authUserId: string,
  _authorization: string,
) {
  throw new BadRequestException(
    'Students cannot accept supervision. Send a proposal to the supervisor instead.',
  );
}

async ignoreInterest(
  invitationId: string,
  authUserId: string,
  authorization: string,
) {
  const invitation =
    await this.prisma.supervisorInvitation.findUnique({
      where: { id: invitationId },
    });

  if (!invitation) {
    throw new BadRequestException('Interest record not found');
  }

  if (invitation.status !== 'PENDING') {
    throw new BadRequestException(
      'This expression of interest is no longer active',
    );
  }

  const team = await this.assertTeamLeader(authUserId, authorization);

  if (invitation.teamId && invitation.teamId !== team.id) {
    throw new ForbiddenException(
      'You can only dismiss interests for your own team',
    );
  }

  await this.prisma.supervisorInvitation.update({
    where: { id: invitationId },
    data: { status: 'IGNORED' },
  });

  const dismissedPayload: ProposalInterestDismissedPayload = {
    teamId: invitation.teamId ?? team.id,
    invitationId,
    supervisorId: invitation.supervisorId,
  };

  this.publishProposalEvent(
    DomainEvents.PROPOSAL_INTEREST_DISMISSED,
    authUserId,
    { type: 'team', id: dismissedPayload.teamId },
    dismissedPayload,
    invitationId,
  );
  this.publishProposalEvent(
    DomainEvents.PROPOSAL_INTEREST_DISMISSED,
    authUserId,
    { type: 'supervisor', id: invitation.supervisorId },
    dismissedPayload,
    invitationId,
  );

  return { message: 'Expression of interest dismissed' };
}

async rejectInvitation(
  invitationId: string,
  authUserId: string,
  authorization: string,
) {
  return this.ignoreInterest(
    invitationId,
    authUserId,
    authorization,
  );
}

async getAllProposalsForCoordinator() {
  return this.prisma.proposal.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async getProposalStats(workspaceId?: string) {
  const workspaceFilter = workspaceId
    ? { workspaceId }
    : {};

  const [
    total,
    pending,
    approved,
    rejected,
    pendingSupervisor,
    supervisorAssigned,
  ] = await Promise.all([
    this.prisma.proposal.count({ where: workspaceFilter }),
    this.prisma.proposal.count({
      where: { ...workspaceFilter, status: 'SUPERVISOR_ASSIGNED' },
    }),
    this.prisma.proposal.count({
      where: { ...workspaceFilter, status: 'APPROVED' },
    }),
    this.prisma.proposal.count({
      where: { ...workspaceFilter, status: 'REJECTED' },
    }),
    this.prisma.proposal.count({
      where: { ...workspaceFilter, status: 'PENDING_SUPERVISOR' },
    }),
    this.prisma.proposal.count({
      where: { ...workspaceFilter, status: 'SUPERVISOR_ASSIGNED' },
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
      await this.getTeamIdForUser(authUserId);

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

async getSupervisorReviewQueue(supervisorId: string) {
  await this.expirePendingSupervisorRequests();

  return this.prisma.proposal.findMany({
    where: {
      pendingSupervisorId: supervisorId,
      status: 'PENDING_SUPERVISOR',
      OR: [
        { pendingExpiresAt: null },
        { pendingExpiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
}

async getSupervisorOverview(supervisorId: string) {
  const proposals = await this.prisma.proposal.findMany({
    where: { assignedSupervisorId: supervisorId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      domain: true,
      status: true,
      teamId: true,
      createdAt: true,
    },
  });

  return {
    supervisedProposals: proposals,
    activeCount: proposals.filter(
      (proposal) =>
        proposal.status === 'APPROVED' ||
        proposal.status === 'SUPERVISOR_ASSIGNED',
    ).length,
    approvedCount: proposals.filter(
      (proposal) => proposal.status === 'APPROVED',
    ).length,
    totalCount: proposals.length,
  };
}

private async assertSupervisorCanReviewProposal(
  proposalId: string,
  supervisorId: string,
) {
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new BadRequestException('Proposal not found');
  }

  if (
    proposal.assignedSupervisorId === supervisorId &&
    (proposal.status === 'SUPERVISOR_ASSIGNED' ||
      proposal.status === 'APPROVED')
  ) {
    return proposal;
  }

  if (
    proposal.status === 'PENDING_SUPERVISOR' &&
    proposal.pendingSupervisorId === supervisorId &&
    !proposal.assignedSupervisorId
  ) {
    return proposal;
  }

  throw new ForbiddenException(
    'You are not authorized to review this proposal',
  );
}

private async notifyCoordinatorsProposalAccepted(
  proposalTitle: string,
  proposalId: string,
  teamId: string,
  workspaceId: string,
) {
  const coordinatorIds =
    await this.getWorkspaceCoordinatorIds(workspaceId);

  await Promise.allSettled(
    coordinatorIds.map((coordinatorId) =>
      this.notificationDispatch.send({
        authUserId: coordinatorId,
        title: 'Proposal Accepted',
        message: `A team proposal "${proposalTitle}" was accepted and supervisor assignment is complete.`,
        type: 'PROPOSAL_ACCEPTED_COORDINATOR',
        entityType: 'PROPOSAL',
        entityId: proposalId,
        route: '/coordinator/proposals',
      }),
    ),
  );
}

private async emailTeamLeaderProposalAccepted(proposal: {
  id: string;
  title: string;
  teamId: string;
  teamLeaderAuthUserId?: string | null;
}) {
  const team = await this.prisma.team.findUnique({
    where: { id: proposal.teamId },
    select: { name: true, leaderId: true },
  });

  const leaderId =
    proposal.teamLeaderAuthUserId ?? team?.leaderId ?? null;

  if (!leaderId) {
    this.logger.warn(
      `No team leader for proposal ${proposal.id}; skipping email`,
    );
    return;
  }

  const leader = await this.prisma.user.findUnique({
    where: { id: leaderId },
    select: { email: true },
  });

  if (!leader?.email) {
    this.logger.warn(
      `Team leader ${leaderId} has no email; skipping proposal-accepted email`,
    );
    return;
  }

  await this.emailService.send(
    buildProposalAcceptedEmail({
      to: leader.email,
      proposalTitle: proposal.title,
      teamName: team?.name,
      actionUrl: this.appUrls.portalUrl('/student/proposal'),
    }),
  );
}

private async emailSupervisorProposalRequest(input: {
  supervisorId: string;
  teamId: string;
  proposalTitle: string;
  workspaceId: string;
  leaderAuthUserId: string;
}) {
  const [supervisor, team, workspace, leaderProfile, leaderUser] =
    await Promise.all([
      this.prisma.user.findUnique({
        where: { id: input.supervisorId },
        select: { email: true },
      }),
      this.prisma.team.findUnique({
        where: { id: input.teamId },
        select: { name: true, projectTitle: true },
      }),
      this.prisma.workspace.findUnique({
        where: { id: input.workspaceId },
        select: { name: true },
      }),
      this.prisma.userProfile.findUnique({
        where: { authUserId: input.leaderAuthUserId },
        select: { fullName: true },
      }),
      this.prisma.user.findUnique({
        where: { id: input.leaderAuthUserId },
        select: { fullName: true },
      }),
    ]);

  if (!supervisor?.email) {
    this.logger.warn(
      `Supervisor ${input.supervisorId} has no email; skipping proposal-request email`,
    );
    return;
  }

  await this.emailService.send(
    buildProposalRequestEmail({
      to: supervisor.email,
      teamName: team?.name ?? 'Team',
      projectTitle:
        team?.projectTitle?.trim() ||
        input.proposalTitle,
      studentLeaderName:
        leaderProfile?.fullName?.trim() ||
        leaderUser?.fullName?.trim() ||
        'Team leader',
      workspaceName: workspace?.name ?? 'FOASIS workspace',
      actionUrl: this.appUrls.portalUrl('/supervisor/requests'),
    }),
  );
}

async resubmitProposal(
  authUserId: string,
  authorization: string,
  _dto: {
    title?: string;
    domain?: string;
    abstract?: string;
    proposalPdfUrl?: string;
  },
) {
  await this.assertTeamLeader(authUserId, authorization);

  const teamId = await this.getTeamIdFromAuth(authorization);

  if (await this.teamsService.isTeamWorkflowLocked(teamId)) {
    throw new BadRequestException(
      'Proposal workflow is locked',
    );
  }

  const team = await this.prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team || !isTeamProfileComplete(team)) {
    throw new BadRequestException(
      'Complete your team profile on the team page before resubmitting',
    );
  }

  const proposal = await this.prisma.proposal.findUnique({
    where: { teamId },
  });

  if (!proposal) {
    return this.ensureProposalForTeam(teamId, authUserId);
  }

  if (proposal.status !== 'REJECTED') {
    throw new BadRequestException(
      'Only rejected proposals can be resubmitted',
    );
  }

  await this.syncProposalFromTeam(teamId);

  const updated = await this.prisma.proposal.findUniqueOrThrow({
    where: { id: proposal.id },
  });

  await this.notifyTeamMembers(proposal.teamId, {
    title: 'Proposal Revised',
    message: `Your team revised the proposal "${updated.title}" and it is ready for supervisor review.`,
    type: 'PROPOSAL_RESUBMITTED',
    entityType: 'PROPOSAL',
    entityId: updated.id,
    route: '/student/proposal',
  });

  await this.activityLogsService.logActivity(
    authUserId,
    'Proposal Resubmitted',
    `Revised proposal "${updated.title}" after supervisor feedback.`,
  );

  const resubmittedPayload: ProposalSnapshotPayload = {
    teamId,
    proposal: serializeProposal(updated),
  };

  this.publishProposalEvent(
    DomainEvents.PROPOSAL_RESUBMITTED,
    authUserId,
    { type: 'team', id: teamId },
    resubmittedPayload,
    updated.id,
  );

  return updated;
}

async approveProposal(
  proposalId: string,
  supervisorId: string,
) {
  const proposal =
    await this.assertSupervisorCanReviewProposal(
      proposalId,
      supervisorId,
    );

  if (
    proposal.status === 'APPROVED' ||
    proposal.status === 'SUPERVISOR_ASSIGNED'
  ) {
    throw new BadRequestException('Proposal is already accepted');
  }

  const now = new Date();

  const updated = await this.prisma.$transaction(async (tx) => {
    const acceptedCount = await tx.proposal.count({
      where: {
        assignedSupervisorId: supervisorId,
        status: { in: ['SUPERVISOR_ASSIGNED', 'APPROVED'] },
      },
    });

    if (acceptedCount >= SUPERVISOR_MAX_ACCEPTED_TEAMS) {
      throw new BadRequestException(
        'You have reached the maximum of 3 accepted teams',
      );
    }

    const result = await tx.proposal.updateMany({
      where: {
        id: proposalId,
        status: 'PENDING_SUPERVISOR',
        pendingSupervisorId: supervisorId,
        assignedSupervisorId: null,
      },
      data: {
        assignedSupervisorId: supervisorId,
        status: 'APPROVED',
        pendingSupervisorId: null,
        pendingExpiresAt: null,
        reviewedAt: now,
        reviewedById: supervisorId,
        reviewFeedback: null,
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'This proposal is no longer pending your review',
      );
    }

    await tx.supervisorRequest.updateMany({
      where: {
        proposalId,
        supervisorId,
        status: 'PENDING',
      },
      data: { status: 'ACCEPTED', resolvedAt: now },
    });

    await tx.supervisorInvitation.deleteMany({
      where: {
        OR: [
          { teamId: proposal.teamId },
          { proposalId },
        ],
      },
    });

    return tx.proposal.findUniqueOrThrow({
      where: { id: proposalId },
    });
  });

  await this.notifyTeamMembers(proposal.teamId, {
    title: 'Proposal Accepted',
    message: `Your FOASIS proposal "${proposal.title}" has been accepted by your supervisor.`,
    type: 'PROPOSAL_ACCEPTED',
    entityType: 'PROPOSAL',
    entityId: proposal.id,
    route: '/student/proposal',
  });

  await this.notificationDispatch.send({
    authUserId: supervisorId,
    title: 'Proposal Accepted',
    message: `You accepted the proposal "${proposal.title}" and are now assigned as supervisor.`,
    type: 'PROPOSAL_ACCEPTED',
    entityType: 'PROPOSAL',
    entityId: proposal.id,
    route: '/supervisor/teams',
  });

  await this.notifyCoordinatorsProposalAccepted(
    proposal.title,
    proposal.id,
    proposal.teamId,
    proposal.workspaceId,
  );

  await this.activityLogsService.logActivity(
    supervisorId,
    'Proposal Accepted',
    `Accepted proposal "${proposal.title}" and was assigned as supervisor.`,
  );

  await this.enforceSupervisorCapacity(supervisorId);

  const acceptedPayload: ProposalSnapshotPayload = {
    teamId: proposal.teamId,
    proposal: serializeProposal(updated),
  };

  this.publishProposalEvent(
    DomainEvents.PROPOSAL_ACCEPTED,
    supervisorId,
    { type: 'team', id: proposal.teamId },
    acceptedPayload,
    proposal.id,
  );
  this.publishProposalEvent(
    DomainEvents.PROPOSAL_ACCEPTED,
    supervisorId,
    { type: 'supervisor', id: supervisorId },
    acceptedPayload,
    proposal.id,
  );
  await this.publishProposalEventToCoordinators(
    DomainEvents.PROPOSAL_ACCEPTED,
    supervisorId,
    acceptedPayload,
    proposal.id,
    proposal.workspaceId,
  );

  void this.emailTeamLeaderProposalAccepted(updated).catch((error) => {
    this.logger.warn(
      `Failed to send proposal-accepted email for ${proposal.id}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  });

  return updated;
}

async rejectProposal(
  proposalId: string,
  supervisorId: string,
  reason: string,
) {
  const proposal =
    await this.assertSupervisorCanReviewProposal(
      proposalId,
      supervisorId,
    );

  if (!reason?.trim()) {
    throw new BadRequestException(
      'Review feedback is required when rejecting a proposal',
    );
  }

  const now = new Date();
  const trimmedReason = reason.trim();

  const updated = await this.prisma.$transaction(async (tx) => {
    const result = await tx.proposal.updateMany({
      where: {
        id: proposalId,
        status: 'PENDING_SUPERVISOR',
        pendingSupervisorId: supervisorId,
      },
      data: {
        status: 'DRAFT',
        reviewFeedback: trimmedReason,
        reviewedAt: now,
        reviewedById: supervisorId,
        assignedSupervisorId: null,
        pendingSupervisorId: null,
        pendingExpiresAt: null,
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'This proposal is no longer pending your review',
      );
    }

    await tx.supervisorRequest.updateMany({
      where: {
        proposalId,
        supervisorId,
        status: 'PENDING',
      },
      data: {
        status: 'REJECTED',
        rejectionReason: trimmedReason,
        resolvedAt: now,
      },
    });

    return tx.proposal.findUniqueOrThrow({
      where: { id: proposalId },
    });
  });

  await this.notifyTeamMembers(proposal.teamId, {
    title: 'Proposal Rejected',
    message: `Your proposal "${proposal.title}" was rejected. Feedback: ${trimmedReason}`,
    type: 'PROPOSAL_REJECTED',
    entityType: 'PROPOSAL',
    entityId: proposal.id,
    route: '/student/proposal',
  });

  await this.activityLogsService.logActivity(
    supervisorId,
    'Proposal Rejected',
    `Rejected proposal "${proposal.title}" with review feedback.`,
  );

  const rejectedPayload: ProposalSnapshotPayload = {
    teamId: proposal.teamId,
    proposal: serializeProposal(updated),
  };

  this.publishProposalEvent(
    DomainEvents.PROPOSAL_REJECTED,
    supervisorId,
    { type: 'team', id: proposal.teamId },
    rejectedPayload,
    proposal.id,
  );
  this.publishProposalEvent(
    DomainEvents.PROPOSAL_REJECTED,
    supervisorId,
    { type: 'supervisor', id: supervisorId },
    rejectedPayload,
    proposal.id,
  );

  return updated;
}

private publishProposalEvent(
  name: string,
  actorId: string | undefined,
  scope: DomainEventScope,
  payload: object,
  entityId: string,
) {
  this.domainEventService.emitSafe({
    name,
    timestamp: new Date().toISOString(),
    actorId,
    scope,
    entity: { type: 'PROPOSAL', id: entityId },
    payload,
  });
}

private async publishProposalEventToCoordinators(
  name: string,
  actorId: string | undefined,
  payload: ProposalSnapshotPayload,
  entityId: string,
  workspaceId: string,
) {
  const coordinatorIds =
    await this.getWorkspaceCoordinatorIds(workspaceId);

  for (const coordinatorId of coordinatorIds) {
    this.publishProposalEvent(
      name,
      actorId,
      { type: 'coordinator', id: coordinatorId },
      payload,
      entityId,
    );
  }
}

}