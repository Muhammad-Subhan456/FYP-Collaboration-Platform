import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TeamsController } from './teams.controller';

@Module({
  imports: [CommonModule],
  controllers: [TeamsController],
})
export class TeamsModule {}