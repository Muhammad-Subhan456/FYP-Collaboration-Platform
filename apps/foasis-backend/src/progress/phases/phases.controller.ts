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
import { PhaseStatus } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { PhasesService } from './phases.service';

type WorkspaceRequest = {
  workspaceId: string;
};

@Controller('phases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Roles('COORDINATOR', 'SUPERVISOR', 'STUDENT')
  @Get()
  listPhases(
    @Req() req: WorkspaceRequest,
    @Query('status') status?: PhaseStatus,
  ) {
    return this.phasesService.listPhases(req.workspaceId, status);
  }

  @Roles('COORDINATOR')
  @Get(':id/weightage-validation')
  validateWeightages(@Param('id') id: string) {
    return this.phasesService.validatePhaseWeightages(id);
  }

  @Roles('COORDINATOR', 'SUPERVISOR', 'STUDENT')
  @Get(':id')
  getPhase(@Param('id') id: string) {
    return this.phasesService.getPhase(id);
  }

  @Roles('COORDINATOR')
  @Post()
  createPhase(
    @Req() req: WorkspaceRequest,
    @Body() dto: CreatePhaseDto,
  ) {
    return this.phasesService.createPhase(req.workspaceId, dto);
  }

  @Roles('COORDINATOR')
  @Patch(':id')
  updatePhase(
    @Param('id') id: string,
    @Body() dto: UpdatePhaseDto,
  ) {
    return this.phasesService.updatePhase(id, dto);
  }

  @Roles('COORDINATOR')
  @Post(':id/publish-configuration')
  publishPhaseConfiguration(@Param('id') id: string) {
    return this.phasesService.publishPhaseConfiguration(id);
  }

  @Roles('COORDINATOR')
  @Post(':id/recalculate-gpa')
  recalculateGpa(
    @Req() req: WorkspaceRequest,
    @Param('id') id: string,
  ) {
    return this.phasesService.recalculatePhaseGpa(req.workspaceId, id);
  }

  @Roles('COORDINATOR')
  @Delete(':id')
  deletePhase(@Param('id') id: string) {
    return this.phasesService.deletePhase(id);
  }
}
