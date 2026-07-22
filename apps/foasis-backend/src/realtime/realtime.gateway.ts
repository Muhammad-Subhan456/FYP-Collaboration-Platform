import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { resolveCorsOrigin } from '../common/cors.config';
import { gaTrace } from '../common/trace/ga-trace';
import { DomainEvents } from '../domain-events/domain-event.constants';
import type { DomainEvent } from '../domain-events/domain-event.types';

import type { RealtimeEventDto } from './dto/realtime-event.dto';
import {
  RealtimeRoomService,
  type RealtimeUser,
} from './realtime-room.service';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: resolveCorsOrigin(),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25_000,
  pingTimeout: 20_000,
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly roomService: RealtimeRoomService,
  ) {}

  afterInit() {
    this.logger.log('Realtime WebSocket gateway initialized (/realtime)');
  }

  async handleConnection(client: Socket) {
    try {
      const user = await this.roomService.authenticate(client);
      const rooms = await this.roomService.resolveRooms(user);

      for (const room of rooms) {
        await client.join(room);
      }

      client.data.user = user;
      client.emit('realtime.connected', {
        userId: user.userId,
        rooms,
      });

      gaTrace('7-room-join', {
        socketId: client.id,
        userId: user.userId,
        role: user.role,
        workspaceId: user.workspaceId,
        rooms,
      });

      this.logger.log(
        `WebSocket connected: ${user.userId} (${user.role}) → [${rooms.join(', ')}]`,
      );
    } catch (error) {
      this.logger.warn(
        `WebSocket connection rejected: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      client.emit('realtime.error', {
        message: 'Authentication failed',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as RealtimeUser | undefined;
    if (user?.userId) {
      this.logger.debug(`WebSocket disconnected: ${user.userId}`);
    }
  }

  /**
   * Dynamically join a connected user's sockets into a team room without
   * requiring a full reconnect (e.g. after team create / join accept).
   */
  async joinUserToTeamRoom(
    userId: string,
    teamId: string,
  ): Promise<void> {
    if (!this.server) {
      return;
    }

    const userRoom = this.roomService.userRoom(userId);
    const teamRoom = this.roomService.teamRoom(teamId);
    const sockets = await this.server.in(userRoom).fetchSockets();

    for (const socket of sockets) {
      await socket.join(teamRoom);
    }

    if (sockets.length > 0) {
      this.logger.log(
        `Joined ${sockets.length} socket(s) for ${userId} → ${teamRoom}`,
      );
    }
  }

  /** Dispatch a domain event to the appropriate room(s). */
  dispatch(event: DomainEvent): void {
    if (!this.server) {
      this.logger.warn(
        `Realtime server not ready; skipped ${event.name}`,
      );
      return;
    }

    const wire = this.toWireEvent(event);
    const room = this.roomForScope(event.scope);

    if (!room) {
      this.logger.warn(
        `No room mapping for scope ${event.scope.type}:${event.scope.id}`,
      );
      return;
    }

    if (event.name === DomainEvents.GLOBAL_ANNOUNCEMENT_PUBLISHED) {
      void this.server.in(room).fetchSockets().then((sockets) => {
        gaTrace('3-pre-emit', {
          eventName: event.name,
          workspaceId:
            event.scope.type === 'workspace' ? event.scope.id : undefined,
          targetRoom: room,
          socketCount: sockets.length,
          socketIds: sockets.map((socket) => socket.id),
          announcementId: (event.payload as { announcement?: { id?: string } })
            ?.announcement?.id,
        });

        this.server.to(room).emit(event.name, wire);

        gaTrace('4-post-emit', {
          eventName: event.name,
          targetRoom: room,
          announcementId: (event.payload as { announcement?: { id?: string } })
            ?.announcement?.id,
        });
      });
      return;
    }

    const socketsInRoom = this.server.in(room).fetchSockets();
    this.server.to(room).emit(event.name, wire);

    if (event.name === 'global_announcement.published' || event.name === 'notification.created') {
      void socketsInRoom.then((sockets) => {
        this.logger.log(
          `Dispatched ${event.name} → ${room} (${sockets.length} socket(s))`,
        );
      });
    } else {
      this.logger.debug(`Dispatched ${event.name} → ${room}`);
    }
  }

  private roomForScope(
    scope: DomainEvent['scope'],
  ): string | null {
    switch (scope.type) {
      case 'user':
        return this.roomService.userRoom(scope.id);
      case 'team':
        return this.roomService.teamRoom(scope.id);
      case 'supervisor':
        return this.roomService.supervisorRoom(scope.id);
      case 'coordinator':
        return this.roomService.coordinatorRoom(scope.id);
      case 'workspace':
        return this.roomService.workspaceRoom(scope.id);
      default:
        return null;
    }
  }

  private toWireEvent(event: DomainEvent): RealtimeEventDto {
    return {
      event: event.name,
      timestamp: event.timestamp,
      actorId: event.actorId,
      scope: event.scope,
      entity: event.entity,
      payload: event.payload,
    };
  }
}
