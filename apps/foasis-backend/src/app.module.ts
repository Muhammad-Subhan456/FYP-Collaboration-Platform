import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgressModule } from './progress/progress.module';
import { ProposalsModule } from './proposals/proposals.module';
import { TeamsModule } from './teams/teams.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { StudentModule } from './student/student.module';
import { SupervisorModule } from './supervisor/supervisor.module';
import { CoordinatorModule } from './coordinator/coordinator.module';
import { EvaluatorModule } from './evaluator/evaluator.module';

/**
 * FOASIS modular monolith root module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    ProposalsModule,
    NotificationsModule,
    ProgressModule,
    DashboardModule,
    UploadsModule,
    MeModule,
    HealthModule,
    StudentModule,
    SupervisorModule,
    CoordinatorModule,
    EvaluatorModule,
  ],
})
export class AppModule {}
