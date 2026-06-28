import { Module } from '@nestjs/common';

import { ProposalsModule } from '../../proposals/proposals.module';
import { UsersModule } from '../../users/users.module';
import { ProgressCommonModule } from '../common/common.module';

import { WorkStreamController } from './work-stream.controller';
import { WorkStreamService } from './work-stream.service';

@Module({
  imports: [ProgressCommonModule, ProposalsModule, UsersModule],
  controllers: [WorkStreamController],
  providers: [WorkStreamService],
  exports: [WorkStreamService],
})
export class WorkStreamModule {}
