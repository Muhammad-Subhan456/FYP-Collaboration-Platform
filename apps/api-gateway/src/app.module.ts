import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { ProposalsModule } from './proposals/proposals.module';
import { MeModule } from './me/me.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    AuthModule,
    UsersModule,
    TeamsModule,
    ProposalsModule,
    MeModule,
    DashboardModule,
    CommonModule,
  ],
})
export class AppModule {}