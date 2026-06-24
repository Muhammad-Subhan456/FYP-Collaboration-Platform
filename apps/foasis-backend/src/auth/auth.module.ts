import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsController } from './organizations/organizations.controller';
import { OrganizationsService } from './organizations/organizations.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AuthController, OrganizationsController],
  providers: [AuthService, OrganizationsService],
  exports: [AuthService],
})
export class AuthModule {}
