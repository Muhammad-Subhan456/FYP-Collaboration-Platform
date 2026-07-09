import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { SkipWorkspace } from '../common/decorators/skip-workspace.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('super-admin/workspaces')
@SkipWorkspace()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
  ) {}

  @Get()
  list(@Query('includeArchived') includeArchived?: string) {
    return this.workspacesService.list(
      includeArchived === 'true',
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspacesService.findById(id);
  }

  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(dto, req.user.userId);
  }

  @Patch(':id')
  update(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, dto, req.user.userId);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.workspacesService.archive(id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.workspacesService.restore(id);
  }
}
