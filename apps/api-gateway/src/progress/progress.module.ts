import { Module } from '@nestjs/common';

import { ProgressController } from './progress.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [ProgressController],
})
export class ProgressModule {}
