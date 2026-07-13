import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';

import { WorkspaceModule } from '../workspace/workspace.module';

import { AuthContextService } from './auth-context.service';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { GatewayHttpService } from './gateway-http.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { InternalOrJwtAuthGuard } from './guards/internal-or-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { WorkspaceGuard } from './guards/workspace.guard';
import { WorkspaceContextInterceptor } from './interceptors/workspace-context.interceptor';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [
    WorkspaceModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // Controlled only via JWT_EXPIRES_IN in .env (e.g. 8h, 12h, 1d).
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
            '8h') as StringValue,
        },
      }),
    }),
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    SuperAdminGuard,
    WorkspaceGuard,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: WorkspaceGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: WorkspaceContextInterceptor,
    },
    InternalApiKeyGuard,
    InternalOrJwtAuthGuard,
    GatewayHttpService,
    AuthContextService,
  ],
  exports: [
    JwtModule,
    PassportModule,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    SuperAdminGuard,
    WorkspaceGuard,
    InternalApiKeyGuard,
    InternalOrJwtAuthGuard,
    GatewayHttpService,
    AuthContextService,
  ],
})
export class CommonModule {}
