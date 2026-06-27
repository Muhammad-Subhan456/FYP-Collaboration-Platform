import { Module, forwardRef } from '@nestjs/common';

import { ActivityLogsModule } from '../progress/activity-logs/activity-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamsModule } from '../teams/teams.module';

import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';

@Module({
  imports: [
    forwardRef(() => TeamsModule),
    NotificationsModule,
    forwardRef(() => ActivityLogsModule),
  ],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
