import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OrganizationsController } from '../organizations/organizations.controller';
import { OrganizationsService } from '../organizations/organizations.service';
import { jwtConstants } from './constants/jwt.constants';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';

const jwtExpiresIn =
  process.env.JWT_EXPIRES_IN ?? '8h';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: jwtExpiresIn as `${number}h`,
      },
    }),
  ],
  controllers: [AuthController, OrganizationsController],
  providers: [
  AuthService,
  OrganizationsService,
  JwtStrategy,
  RolesGuard,
  InternalApiKeyGuard,
],
})
export class AuthModule {}