import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { CommonModule } from '../common/common.module';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [PassportModule, CommonModule],
  controllers: [AuthController],
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