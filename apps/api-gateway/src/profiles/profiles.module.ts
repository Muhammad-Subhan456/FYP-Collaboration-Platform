import { Module } from '@nestjs/common';

import { ProfilesController } from './profiles.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [ProfilesController],
})
export class ProfilesModule {}
