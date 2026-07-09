import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { DeliverablesService } from './deliverables.service';

import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { PublishDeliverableTemplateDto } from '../deliverable-templates/dto/publish-deliverable-template.dto';

@Controller('deliverables')
export class DeliverablesController {
  constructor(
    private readonly deliverablesService:
      DeliverablesService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Post()
  createDeliverable(
    @Req() req: any,
    @Body() dto: CreateDeliverableDto,
  ) {
    return this.deliverablesService
      .createDeliverable(
        req.user.userId,
        dto,
      );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Post('publish-template')
  publishFromTemplate(
    @Req() req: any,
    @Body() dto: PublishDeliverableTemplateDto,
  ) {
    return this.deliverablesService.publishFromTemplate(
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get('my')
  getMyDeliverables(
    @Req() req: any,
    @Query('phaseId') phaseId?: string,
  ) {
    return this.deliverablesService.getMyDeliverables(
      req.user.userId,
      phaseId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('for-my-team')
  getForMyTeam(
    @Headers('authorization') authorization: string,
    @Query('phaseId') phaseId?: string,
  ) {
    return this.deliverablesService.getForMyTeam(
      authorization,
      phaseId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Patch(':id/extend-deadline')
  extendDeadline(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ExtendDeadlineDto,
  ) {
    return this.deliverablesService
      .extendDeadline(
        id,
        req.user.userId,
        dto,
      );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Patch(':id')
  updateDeliverable(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDeliverableDto,
  ) {
    return this.deliverablesService
      .updateDeliverable(
        id,
        req.user.userId,
        dto,
      );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Delete(':id')
  deleteDeliverable(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.deliverablesService.deleteDeliverable(
      id,
      req.user.userId,
    );
  }
}
