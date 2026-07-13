import { Module } from '@nestjs/common';

import { AppUrlsService } from '../../common/app-urls.service';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { ProgressCommonModule } from '../common/common.module';
import { DeliverableTemplatesModule } from '../deliverable-templates/deliverable-templates.module';
import { PhasesModule } from '../phases/phases.module';
import { WorkStreamModule } from '../work-stream/work-stream.module';

import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';

@Module({
  imports: [
    ActivityLogsModule,
    ProgressCommonModule,
    WorkStreamModule,
    DeliverableTemplatesModule,
    PhasesModule,
  ],
  controllers: [DeliverablesController],
  providers: [DeliverablesService, AppUrlsService],
  exports: [DeliverablesService],
})
export class DeliverablesModule {}
