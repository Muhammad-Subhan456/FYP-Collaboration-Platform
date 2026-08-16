import { Module, forwardRef } from '@nestjs/common';

import { ProposalsModule } from '../../proposals/proposals.module';
import { UsersModule } from '../../users/users.module';
import { ProgressCommonModule } from '../common/common.module';

import { WorkStreamController } from './work-stream.controller';
import { WorkStreamService } from './work-stream.service';

@Module({
  imports: [
    ProgressCommonModule,
    // Cycle: ProposalsModule → DeliverablesModule → WorkStreamModule → ProposalsModule
    forwardRef(() => ProposalsModule),
    UsersModule,
  ],
  controllers: [WorkStreamController],
  providers: [WorkStreamService],
  exports: [WorkStreamService],
})
export class WorkStreamModule {}
