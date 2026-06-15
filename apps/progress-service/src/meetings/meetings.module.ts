import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { ActivityLogsModule } from 'src/activity-logs/activity-logs.module';

@Module({
  imports: [PrismaModule, ActivityLogsModule ],
  controllers: [
    MeetingsController,
  ],
  providers: [
    MeetingsService,
  ],
})
export class MeetingsModule {}