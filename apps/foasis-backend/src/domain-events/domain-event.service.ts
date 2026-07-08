import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import type { DomainEvent } from './domain-event.types';

@Injectable()
export class DomainEventService {
  private readonly logger = new Logger(DomainEventService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Publish an in-process domain event. Transport layers (WebSocket, email, push)
   * subscribe via @OnEvent handlers — business services never call the gateway.
   */
  emit<T extends object>(event: DomainEvent<T>): void {
    this.eventEmitter.emit(event.name, event);
  }

  emitSafe<T extends object>(event: DomainEvent<T>): void {
    try {
      this.emit(event);
    } catch (error) {
      this.logger.error(
        `Failed to emit domain event ${event.name}`,
        error,
      );
    }
  }
}
