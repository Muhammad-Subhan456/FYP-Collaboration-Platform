import { Module, forwardRef } from '@nestjs/common';

import { DomainEventsModule } from '../../domain-events/domain-events.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { DeliverablesModule } from '../deliverables/deliverables.module';

import { GpaCalculationService } from '../gpa/gpa-calculation.service';

import { DeliverableTemplatesController } from './deliverable-templates.controller';
import { DeliverableTemplatesService } from './deliverable-templates.service';

@Module({
  imports: [
    ActivityLogsModule,
    DomainEventsModule,
    forwardRef(() => DeliverablesModule),
  ],
  controllers: [DeliverableTemplatesController],
  providers: [DeliverableTemplatesService, GpaCalculationService],
  exports: [DeliverableTemplatesService],
})
export class DeliverableTemplatesModule {}
