import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { TeamAccessService } from './team-access.service';
import { ProposalAccessService } from './proposal-access.service';

@Module({
  imports: [HttpModule],
  providers: [TeamAccessService, ProposalAccessService],
  exports: [TeamAccessService, ProposalAccessService],
})
export class CommonModule {}
