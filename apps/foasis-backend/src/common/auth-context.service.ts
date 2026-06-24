import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthContextService {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  getUserIdFromAuthorization(
    authorization: string,
  ): string {
    if (!authorization) {
      throw new UnauthorizedException(
        'Authorization header is required',
      );
    }

    const token = authorization.replace(
      /^Bearer\s+/i,
      '',
    );

    const payload = this.jwtService.verify<{
      sub: string;
    }>(token);

    if (!payload?.sub) {
      throw new UnauthorizedException(
        'Invalid access token',
      );
    }

    return payload.sub;
  }
}
