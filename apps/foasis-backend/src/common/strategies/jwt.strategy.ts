import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AUTH_TOKEN_TYPES } from '../../auth/auth.constants';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email?: string;
    role?: string;
    workspaceId?: string | null;
    type?: string;
    sv?: number;
  }) {
    if (payload.type !== AUTH_TOKEN_TYPES.ACCESS) {
      throw new UnauthorizedException('Invalid token type');
    }

    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        isActive: true,
        sessionVersion: true,
      },
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
  }
}
