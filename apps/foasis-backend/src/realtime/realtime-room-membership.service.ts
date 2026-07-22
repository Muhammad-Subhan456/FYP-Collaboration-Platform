import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { DomainEvents } from '../domain-events/domain-event.constants';
import type { DomainEvent } from '../domain-events/domain-event.types';

import { RealtimeGateway } from './realtime.gateway';

type TeamMembershipPayload = {
  teamId?: string;
  member?: { authUserId?: string };
  leaderId?: string;
};

type ProposalAcceptedPayload = {
  teamId?: string;
  proposal?: { assignedSupervisorId?: string | null };
};

/**
 * Keeps Socket.IO room membership in sync when teams / supervision change.
 * Domain events stay the source of truth — this only joins rooms.
 */
@Injectable()
export class RealtimeRoomMembershipService {
  private readonly logger = new Logger(
    RealtimeRoomMembershipService.name,
  );

  constructor(private readonly gateway: RealtimeGateway) {}

  @OnEvent(DomainEvents.TEAM_CREATED)
  async onTeamCreated(event: DomainEvent<TeamMembershipPayload>) {
    const teamId = event.payload.teamId;
    const leaderId = event.payload.leaderId ?? event.actorId;
    if (!teamId || !leaderId) {
      return;
    }

    try {
      await this.gateway.joinUserToTeamRoom(leaderId, teamId);
    } catch (error) {
      this.logger.warn(
        `Failed to join leader ${leaderId} to team ${teamId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  @OnEvent(DomainEvents.TEAM_MEMBER_JOINED)
  async onTeamMemberJoined(
    event: DomainEvent<TeamMembershipPayload>,
  ) {
    const teamId = event.payload.teamId;
    const authUserId = event.payload.member?.authUserId;
    if (!teamId || !authUserId) {
      return;
    }

    try {
      await this.gateway.joinUserToTeamRoom(authUserId, teamId);
    } catch (error) {
      this.logger.warn(
        `Failed to join member ${authUserId} to team ${teamId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  @OnEvent(DomainEvents.PROPOSAL_ACCEPTED)
  async onProposalAccepted(
    event: DomainEvent<ProposalAcceptedPayload>,
  ) {
    const teamId = event.payload.teamId;
    const supervisorId =
      event.payload.proposal?.assignedSupervisorId ?? event.actorId;
    if (!teamId || !supervisorId) {
      return;
    }

    try {
      await this.gateway.joinUserToTeamRoom(supervisorId, teamId);
    } catch (error) {
      this.logger.warn(
        `Failed to join supervisor ${supervisorId} to team ${teamId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }
}
