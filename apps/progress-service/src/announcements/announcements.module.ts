import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
