import { Module } from '@nestjs/common';

import { InvitationsModule } from '../invitations/invitations.module';

import { WorkspacesController } from './workspaces.controller';
import { SuperAdminController } from './super-admin.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceBootstrapService } from './workspace-bootstrap.service';
import { WorkspaceContextService } from './workspace-context.service';
import { WorkspaceSettingsService } from './workspace-settings.service';

@Module({
  imports: [InvitationsModule],
  controllers: [WorkspacesController, SuperAdminController],
  providers: [
    WorkspacesService,
    WorkspaceContextService,
    WorkspaceBootstrapService,
    WorkspaceSettingsService,
  ],
  exports: [
    WorkspacesService,
    WorkspaceContextService,
    WorkspaceSettingsService,
  ],
})
export class WorkspaceModule {}
