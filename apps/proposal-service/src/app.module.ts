import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProposalsModule } from './proposals/proposals.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProposalsModule,
  ],
})
export class AppModule {}