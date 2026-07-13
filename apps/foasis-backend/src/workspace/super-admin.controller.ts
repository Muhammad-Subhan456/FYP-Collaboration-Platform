import { Controller, Get, UseGuards } from '@nestjs/common';

import { SkipWorkspace } from '../common/decorators/skip-workspace.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

import { WorkspacesService } from './workspaces.service';

@Controller('super-admin')
@SkipWorkspace()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get('system-health')
  getSystemHealth() {
    return this.workspacesService.getSystemHealth();
  }
}
