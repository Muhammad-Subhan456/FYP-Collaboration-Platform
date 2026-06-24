import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthContextService } from './auth-context.service';
import { GatewayHttpService } from './gateway-http.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { InternalOrJwtAuthGuard } from './guards/internal-or-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get('JWT_EXPIRES_IN') ?? '8h') as `${number}h`,
        },
      }),
    }),
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
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
    InternalApiKeyGuard,
    InternalOrJwtAuthGuard,
    GatewayHttpService,
    AuthContextService,
  ],
})
export class CommonModule {}
