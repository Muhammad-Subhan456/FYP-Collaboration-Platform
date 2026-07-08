import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

import { ProposalsService } from '../proposals/proposals.service';
import { TeamsService } from '../teams/teams.service';

export interface RealtimeUser {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class RealtimeRoomService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly teamsService: TeamsService,
    private readonly proposalsService: ProposalsService,
  ) {}

  extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }

    return null;
  }

  async authenticate(client: Socket): Promise<RealtimeUser> {
    const token = this.extractToken(client);

    if (!token) {
      throw new UnauthorizedException('Missing WebSocket token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role: string;
      }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      throw new UnauthorizedException('Invalid WebSocket token');
    }
  }

  userRoom(userId: string) {
    return `user:${userId}`;
  }

  teamRoom(teamId: string) {
    return `team:${teamId}`;
  }

  supervisorRoom(supervisorId: string) {
    return `supervisor:${supervisorId}`;
  }

  coordinatorRoom(userId: string) {
    return `coordinator:${userId}`;
  }

  /** Server-side room membership — never trust client-supplied room names. */
  async resolveRooms(user: RealtimeUser): Promise<string[]> {
    const rooms = new Set<string>([this.userRoom(user.userId)]);

    if (user.role === 'COORDINATOR') {
      rooms.add(this.coordinatorRoom(user.userId));
      return [...rooms];
    }

    if (user.role === 'STUDENT') {
      const team = await this.teamsService
        .getMyTeam(user.userId)
        .catch(() => null);

      if (team?.id) {
        rooms.add(this.teamRoom(team.id));
      }

      return [...rooms];
    }

    if (user.role === 'SUPERVISOR') {
      rooms.add(this.supervisorRoom(user.userId));

      const proposals = await this.proposalsService
        .getSupervisedProposals(user.userId)
        .catch(() => []);

      for (const proposal of proposals) {
        if (proposal.teamId) {
          rooms.add(this.teamRoom(proposal.teamId));
        }
      }

      return [...rooms];
    }

    return [...rooms];
  }
}
