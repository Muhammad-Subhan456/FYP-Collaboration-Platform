import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { DomainEventsModule } from '../../domain-events/domain-events.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

import { GpaCalculationService } from '../gpa/gpa-calculation.service';

import { DeliverableTemplatesController } from './deliverable-templates.controller';
import { DeliverableTemplatesService } from './deliverable-templates.service';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    ActivityLogsModule,
    DomainEventsModule,
  ],
  controllers: [DeliverableTemplatesController],
  providers: [DeliverableTemplatesService, GpaCalculationService],
  exports: [DeliverableTemplatesService],
})
export class DeliverableTemplatesModule {}
