import { Module } from '@nestjs/common';

import { ProgressCommonModule } from '../common/common.module';
import { StudentContextModule } from '../../student/student-context.module';

import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [ProgressCommonModule, StudentContextModule],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
