import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from '../prisma/prisma.module';
import { RemindersService } from './reminders.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    HttpModule,
  ],
  providers: [RemindersService],
})
export class RemindersModule {}
