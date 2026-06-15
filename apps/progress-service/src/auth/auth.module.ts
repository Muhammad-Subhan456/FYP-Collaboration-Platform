import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [PassportModule],


  providers: [
    JwtStrategy,
    RolesGuard,
  ],

  exports: [
    PassportModule,
    RolesGuard,
  ],
})
export class AuthModule {}