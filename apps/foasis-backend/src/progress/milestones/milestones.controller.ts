import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneStatusDto } from './dto/update-milestone-status.dto';

@Controller('milestones')
export class MilestonesController {
  constructor(
    private readonly milestonesService:
      MilestonesService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Post()
  createMilestone(
    @Req() req: any,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestonesService.createMilestone(
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':proposalId')
  getMilestones(
    @Req() req: any,
    @Param('proposalId') proposalId: string,
  ) {
    return this.milestonesService.getMilestones(
      proposalId,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Patch(':id/status')
  updateMilestoneStatus(
    @Req() req: any,
    @Param('id') milestoneId: string,
    @Body() dto: UpdateMilestoneStatusDto,
  ) {
    return this.milestonesService.updateMilestoneStatus(
      milestoneId,
      req.user.userId,
      dto,
    );
  }
}
