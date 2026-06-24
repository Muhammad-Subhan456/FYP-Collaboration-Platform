import { Module } from '@nestjs/common';

import { ProgressCommonModule } from '../common/common.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';

@Module({
  imports: [ProgressCommonModule, ActivityLogsModule],
  controllers: [MilestonesController],
  providers: [MilestonesService],
})
export class MilestonesModule {}
