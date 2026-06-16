import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { EvaluationResultsController } from './evaluation-results.controller';
import { EvaluationResultsService } from './evaluation-results.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HttpModule
  ],
  controllers: [
    EvaluationResultsController,
  ],
  providers: [
    EvaluationResultsService,
  ],
})
export class EvaluationResultsModule {}