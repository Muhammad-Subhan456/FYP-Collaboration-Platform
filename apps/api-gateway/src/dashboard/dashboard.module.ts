import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';

import { DashboardController } from './dashboard.controller';

@Module({
    imports: [CommonModule],

  controllers: [DashboardController],
})
export class DashboardModule {}