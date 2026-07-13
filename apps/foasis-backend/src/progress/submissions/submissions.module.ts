import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { AppUrlsService } from '../../common/app-urls.service';
import { NotificationsModule } from '../../notifications/notifications.module';
import { ProgressCommonModule } from '../common/common.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [
    ActivityLogsModule,
    ProgressCommonModule,
    NotificationsModule,
    AuthModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, AppUrlsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
