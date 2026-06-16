import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  Headers,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { EvaluationsService } from './evaluations.service';

import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { AssignTeamDto } from './dto/assign-team.dto';

@Controller('evaluations')
export class EvaluationsController {
  constructor(
    private readonly evaluationsService:
      EvaluationsService,
  ) {}

  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles('COORDINATOR')
  @Post()
  createEvaluation(
    @Req() req: any,

    @Body()
    dto: CreateEvaluationDto,
  ) {
    return this.evaluationsService
      .createEvaluation(
        req.user.userId,
        dto,
      );
  }

  @Get()
  getAllEvaluations() {
    return this.evaluationsService
      .getAllEvaluations();
  }

  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles('COORDINATOR')
  @Post(':id/assign-team')
  assignTeam(
    @Param('id')
    evaluationId: string,

    @Body()
    dto: AssignTeamDto,
  ) {
    return this.evaluationsService
      .assignTeam(
        evaluationId,
        dto.teamId,
      );
  }

  @Get('team/:teamId')
  getTeamEvaluations(
    @Param('teamId')
    teamId: string,
  ) {
    return this.evaluationsService
      .getTeamEvaluations(
        teamId,
      );
  }

  @UseGuards(JwtAuthGuard)
@Get('my')
getMyEvaluations(
  @Req() req: any,

  @Headers('authorization')
  authorization: string,
) {
  return this.evaluationsService
    .getMyEvaluations(
      req.user.userId,
      authorization,
    );
}

}