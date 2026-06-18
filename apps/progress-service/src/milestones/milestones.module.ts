import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';

@Module({
  imports: [PrismaModule, CommonModule, ActivityLogsModule],
  controllers: [MilestonesController],
  providers: [MilestonesService],
})
export class MilestonesModule {}
