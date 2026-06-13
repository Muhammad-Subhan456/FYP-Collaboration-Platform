import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';

import { MeController } from './me.controller';

@Module({
    imports: [CommonModule],

  controllers: [MeController],
})
export class MeModule {}