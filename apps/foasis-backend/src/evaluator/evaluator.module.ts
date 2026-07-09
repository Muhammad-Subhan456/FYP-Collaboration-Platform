import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { EvaluationPanelsModule } from '../progress/evaluation-panels/evaluation-panels.module';
import { EvaluationResultsModule } from '../progress/evaluation-results/evaluation-results.module';
import { GlobalAnnouncementsModule } from '../progress/global-announcements/global-announcements.module';
import { UsersModule } from '../users/users.module';

import { EvaluatorController } from './evaluator.controller';
import { EvaluatorPagesService } from './evaluator-pages.service';

@Module({
  imports: [
    EvaluationPanelsModule,
    EvaluationResultsModule,
    GlobalAnnouncementsModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [EvaluatorController],
  providers: [EvaluatorPagesService],
  exports: [EvaluatorPagesService],
})
export class EvaluatorModule {}
