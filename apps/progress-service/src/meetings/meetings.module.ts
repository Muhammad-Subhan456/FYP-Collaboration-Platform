import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    MeetingsController,
  ],
  providers: [
    MeetingsService,
  ],
})
export class MeetingsModule {}