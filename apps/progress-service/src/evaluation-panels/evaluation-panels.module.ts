import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { EvaluationPanelsController } from './evaluation-panels.controller';
import { EvaluationPanelsService } from './evaluation-panels.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EvaluationPanelsController],
  providers: [EvaluationPanelsService],
})
export class EvaluationPanelsModule {}
