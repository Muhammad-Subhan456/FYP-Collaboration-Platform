import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { AuthModule } from '../auth/auth.module';

import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HttpModule,
  ],
  controllers: [
    EvaluationsController,
  ],
  providers: [
    EvaluationsService,
  ],
})
export class EvaluationsModule {}