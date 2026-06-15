import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    DeliverablesController,
  ],
  providers: [
    DeliverablesService,
  ],
})
export class DeliverablesModule {}