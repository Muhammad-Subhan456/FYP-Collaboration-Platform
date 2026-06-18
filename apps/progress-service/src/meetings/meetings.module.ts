import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    ActivityLogsModule,
  ],
  controllers: [MeetingsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
