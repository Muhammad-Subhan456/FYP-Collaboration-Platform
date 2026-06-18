import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
    @Headers('authorization') authorization: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestonesService.createMilestone(
      req.user.userId,
      authorization,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':proposalId')
  getMilestones(
    @Headers('authorization') authorization: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.milestonesService.getMilestones(
      proposalId,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Patch(':id/status')
  updateMilestoneStatus(
    @Req() req: any,
    @Headers('authorization') authorization: string,
    @Param('id') milestoneId: string,
    @Body() dto: UpdateMilestoneStatusDto,
  ) {
    return this.milestonesService.updateMilestoneStatus(
      milestoneId,
      req.user.userId,
      authorization,
      dto,
    );
  }
}
