import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';


import { ProposalsController } from './proposals.controller';

@Module({
    imports: [CommonModule],
  controllers: [ProposalsController],
})
export class ProposalsModule {}