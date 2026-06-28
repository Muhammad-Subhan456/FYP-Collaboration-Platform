import { Module } from '@nestjs/common';

import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { ProgressCommonModule } from '../common/common.module';
import { WorkStreamModule } from '../work-stream/work-stream.module';

import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';

@Module({
  imports: [ActivityLogsModule, ProgressCommonModule, WorkStreamModule],
  controllers: [DeliverablesController],
  providers: [DeliverablesService],
  exports: [DeliverablesService],
})
export class DeliverablesModule {}
