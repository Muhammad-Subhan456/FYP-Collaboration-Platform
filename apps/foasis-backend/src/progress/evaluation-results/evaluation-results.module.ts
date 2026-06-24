import { Module } from '@nestjs/common';

import { NotificationsModule } from '../../notifications/notifications.module';
import { TeamsModule } from '../../teams/teams.module';

import { EvaluationResultsController } from './evaluation-results.controller';
import { EvaluationResultsService } from './evaluation-results.service';

@Module({
  imports: [TeamsModule, NotificationsModule],
  controllers: [EvaluationResultsController],
  providers: [EvaluationResultsService],
})
export class EvaluationResultsModule {}
