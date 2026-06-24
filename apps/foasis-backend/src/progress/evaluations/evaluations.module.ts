import { Module } from '@nestjs/common';

import { NotificationsModule } from '../../notifications/notifications.module';
import { TeamsModule } from '../../teams/teams.module';

import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

@Module({
  imports: [TeamsModule, NotificationsModule],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
