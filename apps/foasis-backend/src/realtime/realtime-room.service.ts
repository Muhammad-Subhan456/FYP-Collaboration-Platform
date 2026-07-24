import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

import { AUTH_TOKEN_TYPES } from '../auth/auth.constants';
import { PrismaService } from '../prisma/prisma.service';
import { ProposalsService } from '../proposals/proposals.service';
import { TeamsService } from '../teams/teams.service';
import { securityConfig } from '../common/security.config';
import { runWithWorkspaceContext } from '../workspace/workspace-als';

export interface RealtimeUser {
  userId: string;
  email: string;
  role: string;
  workspaceId?: string;
}

@Injectable()
export class RealtimeRoomService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly teamsService: TeamsService,
    private readonly proposalsService: ProposalsService,
    private readonly prisma: PrismaService,
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

    if (securityConfig.allowWsQueryToken) {
      const queryToken = client.handshake.query?.token;
      if (typeof queryToken === 'string' && queryToken.length > 0) {
        return queryToken;
      }
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
        workspaceId?: string | null;
        type?: string;
        sv?: number;
      }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      if (payload.type !== AUTH_TOKEN_TYPES.ACCESS) {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { isActive: true, sessionVersion: true },
      });

      if (!user?.isActive) {
        throw new UnauthorizedException('Account is not active');
      }

      const tokenSessionVersion =
        typeof payload.sv === 'number' ? payload.sv : 0;
      if (user.sessionVersion !== tokenSessionVersion) {
        throw new UnauthorizedException('Session has been revoked');
      }

      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        workspaceId: payload.workspaceId ?? undefined,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
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

  workspaceRoom(workspaceId: string) {
    return `workspace:${workspaceId}`;
  }

  /** Server-side room membership — never trust client-supplied room names. */
  async resolveRooms(user: RealtimeUser): Promise<string[]> {
    return runWithWorkspaceContext(user.workspaceId, async () => {
      const rooms = new Set<string>([this.userRoom(user.userId)]);

      if (user.workspaceId) {
        rooms.add(this.workspaceRoom(user.workspaceId));
      }

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
    });
  }
}
