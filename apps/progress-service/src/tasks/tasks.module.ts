import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ActivityLogsModule } from 'src/activity-logs/activity-logs.module';

@Module({
  imports: [PrismaModule, ActivityLogsModule ],
  controllers: [
    TasksController,
  ],
  providers: [
    TasksService,
  ],
})
export class TasksModule {}