import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { MilestonesService } from './milestones.service';

import { CreateMilestoneDto } from './dto/create-milestone.dto';

@Controller('milestones')
export class MilestonesController {
  constructor(
    private readonly milestonesService:
      MilestonesService,
  ) {}

  @Post()
  createMilestone(
    @Body()
    dto: CreateMilestoneDto,
  ) {
    return this.milestonesService
      .createMilestone(dto);
  }

  @Get(':proposalId')
  getMilestones(
    @Param('proposalId')
    proposalId: string,
  ) {
    return this.milestonesService
      .getMilestones(
        proposalId,
      );
  }
}