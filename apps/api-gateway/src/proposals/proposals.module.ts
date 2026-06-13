import { Module } from '@nestjs/common';

import { ProposalsController } from './proposals.controller';

@Module({
  controllers: [ProposalsController],
})
export class ProposalsModule {}