import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { EvaluationPanelsController } from './evaluation-panels.controller';
import { EvaluationPanelsService } from './evaluation-panels.service';

@Module({
  imports: [PrismaModule, AuthModule, HttpModule],
  controllers: [EvaluationPanelsController],
  providers: [EvaluationPanelsService],
})
export class EvaluationPanelsModule {}
