import { Module } from '@nestjs/common';

import { ProposalsModule } from '../../proposals/proposals.module';
import { UsersModule } from '../../users/users.module';
import { ProgressCommonModule } from '../common/common.module';

import { TeamIssuesController } from './team-issues.controller';
import { TeamIssuesService } from './team-issues.service';

@Module({
  imports: [ProgressCommonModule, ProposalsModule, UsersModule],
  controllers: [TeamIssuesController],
  providers: [TeamIssuesService],
  exports: [TeamIssuesService],
})
export class TeamIssuesModule {}
