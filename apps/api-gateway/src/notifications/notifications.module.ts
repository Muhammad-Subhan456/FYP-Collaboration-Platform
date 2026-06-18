import { Module } from '@nestjs/common';

import { NotificationsController } from './notifications.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
