import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';

import { UsersController } from './users.controller';

@Module({
  imports: [CommonModule],
  controllers: [UsersController],
})
export class UsersModule {}