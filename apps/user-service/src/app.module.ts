import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { ProfilesModule } from './profiles/profiles.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    ProfilesModule,
    AuthModule,
  ],
})
export class AppModule {}