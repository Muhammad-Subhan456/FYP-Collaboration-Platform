import { Module } from '@nestjs/common';

import { AppUrlsService } from '../../common/app-urls.service';
import { NotificationsModule } from '../../notifications/notifications.module';
import { TeamsModule } from '../../teams/teams.module';
import { UsersModule } from '../../users/users.module';
import { MembershipBootstrapService } from '../../workspace/membership-bootstrap.service';

import { GpaCalculationService } from '../gpa/gpa-calculation.service';

import { SubmissionEvaluationsController } from './submission-evaluations.controller';
import { SubmissionEvaluationsService } from './submission-evaluations.service';
import { SubmissionResultsController } from './submission-results.controller';
import { SubmissionResultsService } from './submission-results.service';

@Module({
  imports: [TeamsModule, UsersModule, NotificationsModule],
  controllers: [
    SubmissionEvaluationsController,
    SubmissionResultsController,
  ],
  providers: [
    SubmissionEvaluationsService,
    SubmissionResultsService,
    GpaCalculationService,
    AppUrlsService,
    MembershipBootstrapService,
  ],
  exports: [
    SubmissionEvaluationsService,
    SubmissionResultsService,
    GpaCalculationService,
  ],
})
export class SubmissionEvaluationsModule {}
