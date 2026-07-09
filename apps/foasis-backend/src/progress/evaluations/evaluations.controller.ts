import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  Headers,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { EvaluationsService } from './evaluations.service';

import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { AssignTeamDto } from './dto/assign-team.dto';
import { AssignTeamsDto } from './dto/assign-teams.dto';

@Controller('evaluations')
export class EvaluationsController {
  constructor(
    private readonly evaluationsService:
      EvaluationsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Post()
  createEvaluation(
    @Req() req: { user: { userId: string }; workspaceId: string },
    @Body() dto: CreateEvaluationDto,
  ) {
    return this.evaluationsService
      .createEvaluation(
        req.user.userId,
        dto,
        req.workspaceId,
      );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getAllEvaluations(@Req() req: { workspaceId: string }) {
    return this.evaluationsService
      .getAllEvaluations(req.workspaceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('evaluator-overview')
  getEvaluatorOverview(@Req() req: { workspaceId: string }) {
    return this.evaluationsService.getEvaluatorOverview(
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('team/:teamId')
  getTeamEvaluations(
    @Param('teamId') teamId: string,
  ) {
    return this.evaluationsService
      .getTeamEvaluations(
        teamId,
      );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyEvaluations(
    @Headers('authorization')
    authorization: string,
  ) {
    return this.evaluationsService
      .getMyEvaluations(
        authorization,
      );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Post(':id/assign-team')
  assignTeam(
    @Param('id') evaluationId: string,
    @Body() dto: AssignTeamDto,
  ) {
    return this.evaluationsService
      .assignTeam(
        evaluationId,
        dto.teamId,
        dto.panelId,
      );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Post(':id/assign-teams')
  assignTeams(
    @Param('id') evaluationId: string,
    @Body() dto: AssignTeamsDto,
  ) {
    return this.evaluationsService.assignTeams(
      evaluationId,
      dto.teamIds,
      dto.panelId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get(':id/assignments')
  getEvaluationAssignments(
    @Param('id') evaluationId: string,
  ) {
    return this.evaluationsService.getEvaluationAssignments(
      evaluationId,
    );
  }
}
