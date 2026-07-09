import { Module } from '@nestjs/common';

import { InvitationsModule } from '../invitations/invitations.module';

import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceBootstrapService } from './workspace-bootstrap.service';
import { WorkspaceContextService } from './workspace-context.service';

@Module({
  imports: [InvitationsModule],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    WorkspaceContextService,
    WorkspaceBootstrapService,
  ],
  exports: [WorkspacesService, WorkspaceContextService],
})
export class WorkspaceModule {}
