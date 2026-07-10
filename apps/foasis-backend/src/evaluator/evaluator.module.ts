import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { GlobalAnnouncementsModule } from '../progress/global-announcements/global-announcements.module';
import { SubmissionEvaluationsModule } from '../progress/submission-evaluations/submission-evaluations.module';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';

import { EvaluatorController } from './evaluator.controller';
import { EvaluatorPagesService } from './evaluator-pages.service';

@Module({
  imports: [
    SubmissionEvaluationsModule,
    GlobalAnnouncementsModule,
    NotificationsModule,
    UsersModule,
    PrismaModule,
  ],
  controllers: [EvaluatorController],
  providers: [EvaluatorPagesService],
  exports: [EvaluatorPagesService],
})
export class EvaluatorModule {}
