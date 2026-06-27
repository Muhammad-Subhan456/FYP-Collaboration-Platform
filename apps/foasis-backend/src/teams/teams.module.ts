import { Module, forwardRef } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { UsersModule } from '../users/users.module';

import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [
    NotificationsModule,
    UsersModule,
    forwardRef(() => ProposalsModule),
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
