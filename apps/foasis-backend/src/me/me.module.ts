import { Module } from '@nestjs/common';

import { ProposalsModule } from '../proposals/proposals.module';
import { TeamsModule } from '../teams/teams.module';

import { MeController } from './me.controller';

@Module({
  imports: [TeamsModule, ProposalsModule],
  controllers: [MeController],
})
export class MeModule {}
