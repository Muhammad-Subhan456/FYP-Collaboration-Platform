import { Module } from '@nestjs/common';

import { ActivityLogsModule } from '../progress/activity-logs/activity-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { UsersAliasController } from './users-alias.controller';

@Module({
  imports: [NotificationsModule, ActivityLogsModule],
  controllers: [ProfilesController, UsersAliasController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class UsersModule {}
