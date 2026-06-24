import { Module } from '@nestjs/common';

import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { ProgressCommonModule } from '../common/common.module';

import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';

@Module({
  imports: [ActivityLogsModule, ProgressCommonModule],
  controllers: [DeliverablesController],
  providers: [DeliverablesService],
  exports: [DeliverablesService],
})
export class DeliverablesModule {}
