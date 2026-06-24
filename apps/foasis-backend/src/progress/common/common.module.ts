import { Module, forwardRef } from '@nestjs/common';

import { NotificationsModule } from '../../notifications/notifications.module';
import { ProposalsModule } from '../../proposals/proposals.module';
import { TeamsModule } from '../../teams/teams.module';

import { TeamAccessService } from './team-access.service';
import { ProposalAccessService } from './proposal-access.service';

@Module({
  imports: [
    TeamsModule,
    NotificationsModule,
    forwardRef(() => ProposalsModule),
  ],
  providers: [TeamAccessService, ProposalAccessService],
  exports: [TeamAccessService, ProposalAccessService],
})
export class ProgressCommonModule {}
