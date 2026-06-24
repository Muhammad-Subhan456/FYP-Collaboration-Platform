import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';

import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [NotificationsModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
