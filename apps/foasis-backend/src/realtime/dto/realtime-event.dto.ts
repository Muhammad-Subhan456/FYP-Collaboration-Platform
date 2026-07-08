import type {
  DomainEventEntity,
  DomainEventScope,
} from '../../domain-events/domain-event.types';

/** Wire format sent to WebSocket clients (lightweight, no page DTOs). */
export interface RealtimeEventDto {
  event: string;
  timestamp: string;
  actorId?: string;
  scope: DomainEventScope;
  entity?: DomainEventEntity;
  payload: object;
}
