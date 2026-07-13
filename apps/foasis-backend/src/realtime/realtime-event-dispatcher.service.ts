import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { DomainEvents } from '../domain-events/domain-event.constants';
import type { DomainEvent } from '../domain-events/domain-event.types';

import { RealtimeGateway } from './realtime.gateway';

/**
 * Subscribes to in-process domain events and forwards them to WebSocket clients.
 * Business services emit domain events only — never this class or the gateway.
 */
@Injectable()
export class RealtimeEventDispatcher {
  private readonly logger = new Logger(
    RealtimeEventDispatcher.name,
  );

  constructor(private readonly gateway: RealtimeGateway) {}

  @OnEvent(DomainEvents.NOTIFICATION_CREATED)
  onNotificationCreated(event: DomainEvent) {
    this.dispatch(event);
  }

  @OnEvent(DomainEvents.ISSUE_CREATED)
  @OnEvent(DomainEvents.ISSUE_UPDATED)
  @OnEvent(DomainEvents.ISSUE_CLAIMED)
  @OnEvent(DomainEvents.ISSUE_RELEASED)
  @OnEvent(DomainEvents.ISSUE_COMPLETED)
  @OnEvent(DomainEvents.ISSUE_COMMENT_CREATED)
  onIssueEvent(event: DomainEvent) {
    this.dispatch(event);
  }

  @OnEvent(DomainEvents.WORKSTREAM_COMMENT_CREATED)
  @OnEvent(DomainEvents.ANNOUNCEMENT_CREATED)
  @OnEvent(DomainEvents.ANNOUNCEMENT_UPDATED)
  @OnEvent(DomainEvents.ANNOUNCEMENT_DELETED)
  @OnEvent(DomainEvents.GLOBAL_ANNOUNCEMENT_PUBLISHED)
  @OnEvent(DomainEvents.DELIVERABLE_CREATED)
  @OnEvent(DomainEvents.DELIVERABLE_UPDATED)
  @OnEvent(DomainEvents.DELIVERABLE_DEADLINE_EXTENDED)
  @OnEvent(DomainEvents.DELIVERABLE_DELETED)
  @OnEvent(DomainEvents.DELIVERABLE_TEMPLATE_CREATED)
  @OnEvent(DomainEvents.DELIVERABLE_TEMPLATE_UPDATED)
  @OnEvent(DomainEvents.DELIVERABLE_TEMPLATE_DELETED)
  @OnEvent(DomainEvents.SUBMISSION_CREATED)
  @OnEvent(DomainEvents.SUBMISSION_REVIEWED)
  @OnEvent(DomainEvents.SUBMISSION_FINALIZED)
  @OnEvent(DomainEvents.PHASE_CREATED)
  @OnEvent(DomainEvents.PHASE_UPDATED)
  @OnEvent(DomainEvents.PHASE_CONFIGURATION_PUBLISHED)
  @OnEvent(DomainEvents.PHASE_DELETED)
  onWorkStreamEvent(event: DomainEvent) {
    this.dispatch(event);
  }

  @OnEvent(DomainEvents.PROPOSAL_SUBMITTED)
  @OnEvent(DomainEvents.PROPOSAL_ACCEPTED)
  @OnEvent(DomainEvents.PROPOSAL_REJECTED)
  @OnEvent(DomainEvents.PROPOSAL_INTEREST_RECEIVED)
  @OnEvent(DomainEvents.PROPOSAL_INTEREST_DISMISSED)
  @OnEvent(DomainEvents.PROPOSAL_RESUBMITTED)
  onProposalEvent(event: DomainEvent) {
    this.dispatch(event);
  }

  @OnEvent(DomainEvents.TEAM_JOIN_REQUEST_RECEIVED)
  @OnEvent(DomainEvents.TEAM_JOIN_REQUEST_RESOLVED)
  @OnEvent(DomainEvents.TEAM_MEMBER_JOINED)
  @OnEvent(DomainEvents.TEAM_MEMBER_LEFT)
  @OnEvent(DomainEvents.TEAM_ROLE_UPDATED)
  @OnEvent(DomainEvents.TEAM_UPDATED)
  @OnEvent(DomainEvents.TEAM_DELETED)
  onTeamEvent(event: DomainEvent) {
    this.dispatch(event);
  }

  @OnEvent(DomainEvents.EVALUATION_ASSIGNED)
  @OnEvent(DomainEvents.RESULT_PUBLISHED)
  @OnEvent(DomainEvents.RESULT_UPDATED)
  @OnEvent(DomainEvents.SUBMISSION_EVALUATION_ASSIGNED)
  @OnEvent(DomainEvents.SUBMISSION_EVALUATION_UPDATED)
  @OnEvent(DomainEvents.SUBMISSION_EVALUATION_SUBMITTED)
  @OnEvent(DomainEvents.GPA_RECALCULATED)
  onEvaluationEvent(event: DomainEvent) {
    this.dispatch(event);
  }

  @OnEvent(DomainEvents.USER_ROLE_UPDATED)
  @OnEvent(DomainEvents.USER_STATUS_UPDATED)
  onUserMembershipEvent(event: DomainEvent) {
    this.dispatch(event);
  }

  private dispatch(event: DomainEvent): void {
    try {
      this.gateway.dispatch(event);
    } catch (error) {
      this.logger.error(
        `Failed to dispatch realtime event ${event.name}`,
        error,
      );
    }
  }
}
