import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { CreateDeliverableTemplateDto } from './dto/create-deliverable-template.dto';
import { UpdateDeliverableTemplateDto } from './dto/update-deliverable-template.dto';
import { DeliverableTemplatesService } from './deliverable-templates.service';

type WorkspaceRequest = {
  workspaceId: string;
  user: { userId: string };
};

@Controller('deliverable-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliverableTemplatesController {
  constructor(
    private readonly templatesService: DeliverableTemplatesService,
  ) {}

  @Roles('COORDINATOR', 'SUPERVISOR')
  @Get()
  listTemplates(
    @Req() req: WorkspaceRequest,
    @Query('phaseId') phaseId?: string,
  ) {
    return this.templatesService.listTemplates(
      req.workspaceId,
      phaseId,
    );
  }

  @Roles('COORDINATOR', 'SUPERVISOR')
  @Get(':id')
  getTemplate(@Param('id') id: string) {
    return this.templatesService.getTemplate(id);
  }

  @Roles('COORDINATOR')
  @Post()
  createTemplate(
    @Req() req: WorkspaceRequest,
    @Body() dto: CreateDeliverableTemplateDto,
  ) {
    return this.templatesService.createTemplate(
      req.workspaceId,
      req.user.userId,
      dto,
    );
  }

  @Roles('COORDINATOR')
  @Patch(':id')
  updateTemplate(
    @Req() req: WorkspaceRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDeliverableTemplateDto,
  ) {
    return this.templatesService.updateTemplate(
      id,
      req.user.userId,
      dto,
    );
  }

  @Roles('COORDINATOR')
  @Delete(':id')
  deleteTemplate(@Param('id') id: string) {
    return this.templatesService.deleteTemplate(id);
  }
}
