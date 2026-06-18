import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtStrategy } from './strategies/jwt.strategy';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, InternalApiKeyGuard],
  exports: [PassportModule, InternalApiKeyGuard],
})
export class AuthModule {}