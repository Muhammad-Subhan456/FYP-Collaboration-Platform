import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, RolesGuard, InternalApiKeyGuard],
  exports: [PassportModule, RolesGuard, InternalApiKeyGuard],
})
export class AuthModule {}
