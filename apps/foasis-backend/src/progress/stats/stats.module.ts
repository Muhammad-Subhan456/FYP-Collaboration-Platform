import { Module } from '@nestjs/common';

import { ProposalsModule } from '../../proposals/proposals.module';
import { ProgressCommonModule } from '../common/common.module';

import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [ProgressCommonModule, ProposalsModule],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
