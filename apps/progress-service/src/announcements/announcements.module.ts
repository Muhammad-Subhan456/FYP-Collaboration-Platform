import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  imports: [PrismaModule, CommonModule, ActivityLogsModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
