import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { ActivityLogsModule } from 'src/activity-logs/activity-logs.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [PrismaModule, ActivityLogsModule, HttpModule ],
  controllers: [
    SubmissionsController,
  ],
  providers: [
    SubmissionsService,
  ],
})
export class SubmissionsModule {}