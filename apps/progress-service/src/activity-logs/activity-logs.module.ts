import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ActivityLogsController,
  ],
  providers: [
    ActivityLogsService,
  ],
})
export class ActivityLogsModule {}