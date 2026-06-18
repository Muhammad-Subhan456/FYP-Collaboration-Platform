import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { InternalOrJwtAuthGuard } from './guards/internal-or-jwt-auth.guard';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';

@Module({
  imports: [PassportModule],
  providers: [
    JwtStrategy,
    RolesGuard,
    InternalOrJwtAuthGuard,
    InternalApiKeyGuard,
  ],
  exports: [
    PassportModule,
    RolesGuard,
    InternalOrJwtAuthGuard,
    InternalApiKeyGuard,
  ],
})
export class AuthModule {}
