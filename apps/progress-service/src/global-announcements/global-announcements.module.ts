import { Module } from '@nestjs/common';
import { GlobalAnnouncementsController } from './global-announcements.controller';
import { GlobalAnnouncementsService } from './global-announcements.service';

@Module({
  controllers: [GlobalAnnouncementsController],
  providers: [GlobalAnnouncementsService]
})
export class GlobalAnnouncementsModule {}
