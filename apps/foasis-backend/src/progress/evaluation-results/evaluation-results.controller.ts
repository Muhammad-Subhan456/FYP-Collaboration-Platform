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

import { EvaluationResultsService } from './evaluation-results.service';

import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';

@Controller('evaluation-results')
export class EvaluationResultsController {
  constructor(
    private readonly evaluationResultsService:
      EvaluationResultsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR', 'EVALUATOR')
  @Post(':evaluationId')
  createResult(
    @Req() req: any,
    @Param('evaluationId')
    evaluationId: string,
    @Body() dto: CreateResultDto,
  ) {
    return this.evaluationResultsService.createResult(
      evaluationId,
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR', 'EVALUATOR')
  @Patch(':resultId')
  updateResult(
    @Req() req: any,
    @Param('resultId') resultId: string,
    @Body() dto: UpdateResultDto,
  ) {
    return this.evaluationResultsService.updateResult(
      resultId,
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'SUPERVISOR')
  @Get('team/:teamId')
  getResultsForTeam(
    @Param('teamId') teamId: string,
    @Req() req: any,
  ) {
    return this.evaluationResultsService.getResultsForTeam(
      teamId,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('overview')
  getCoordinatorOverview(@Req() req: { workspaceId: string }) {
    return this.evaluationResultsService.getCoordinatorOverview(
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('my')
  getMyResults(
    @Req() req: { user: { userId: string } },
  ) {
    return this.evaluationResultsService.getMyResultsByUserId(
      req.user.userId,
    );
  }
}
