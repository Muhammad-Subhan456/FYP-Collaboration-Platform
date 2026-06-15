import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';

@Module({
  imports: [
    PrismaModule,
    ActivityLogsModule,
  ],
  controllers: [
    DeliverablesController,
  ],
  providers: [
    DeliverablesService,
  ],
})
export class DeliverablesModule {}