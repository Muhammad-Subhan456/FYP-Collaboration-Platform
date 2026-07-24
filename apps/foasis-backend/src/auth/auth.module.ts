import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AppUrlsService } from '../common/app-urls.service';
import { OrganizationsController } from './organizations/organizations.controller';
import { OrganizationsService } from './organizations/organizations.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginAttemptService } from './login-attempt.service';

@Module({
  imports: [NotificationsModule, WorkspaceModule],
  controllers: [AuthController, OrganizationsController],
  providers: [AuthService, OrganizationsService, AppUrlsService, LoginAttemptService],
  exports: [AuthService],
})
export class AuthModule {}
