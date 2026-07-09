import { Module, forwardRef } from '@nestjs/common';

import { EmailModule } from '../../email/email.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { ProposalsModule } from '../../proposals/proposals.module';
import { TeamsModule } from '../../teams/teams.module';
import { GlobalAnnouncementsModule } from '../global-announcements/global-announcements.module';

import { RemindersService } from './reminders.service';
import { ScheduledReminderService } from './scheduled-reminder.service';

@Module({
  imports: [
    NotificationsModule,
    EmailModule,
    ProposalsModule,
    TeamsModule,
    forwardRef(() => GlobalAnnouncementsModule),
  ],
  providers: [RemindersService, ScheduledReminderService],
  exports: [ScheduledReminderService],
})
export class RemindersModule {}
