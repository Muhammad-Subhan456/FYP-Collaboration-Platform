import { Module } from '@nestjs/common';

import { NotificationsModule } from '../../notifications/notifications.module';

import { EvaluationPanelsController } from './evaluation-panels.controller';
import { EvaluationPanelsService } from './evaluation-panels.service';

@Module({
  imports: [NotificationsModule],
  controllers: [EvaluationPanelsController],
  providers: [EvaluationPanelsService],
})
export class EvaluationPanelsModule {}
