import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { ActivityLogsModule } from 'src/activity-logs/activity-logs.module';
import { HttpModule } from '@nestjs/axios';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, ActivityLogsModule, HttpModule, CommonModule],
  controllers: [
    SubmissionsController,
  ],
  providers: [
    SubmissionsService,
  ],
})
export class SubmissionsModule {}