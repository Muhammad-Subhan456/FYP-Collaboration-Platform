import { Module } from '@nestjs/common';

import { NotificationsModule } from '../../notifications/notifications.module';
import { ProposalsModule } from '../../proposals/proposals.module';
import { TeamsModule } from '../../teams/teams.module';

import { RemindersService } from './reminders.service';

@Module({
  imports: [NotificationsModule, ProposalsModule, TeamsModule],
  providers: [RemindersService],
})
export class RemindersModule {}
