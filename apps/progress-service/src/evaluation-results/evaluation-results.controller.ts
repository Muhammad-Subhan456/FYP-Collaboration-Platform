import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Headers,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { EvaluationResultsService } from './evaluation-results.service';

import { CreateResultDto } from './dto/create-result.dto';

@Controller('evaluation-results')
export class EvaluationResultsController {
  constructor(
    private readonly evaluationResultsService:
      EvaluationResultsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Post(':evaluationId')
  createResult(
    @Param('evaluationId')
    evaluationId: string,
    @Body() dto: CreateResultDto,
  ) {
    return this.evaluationResultsService
      .createResult(
        evaluationId,
        dto,
      );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('team/:teamId')
  getResultsForTeam(
    @Param('teamId') teamId: string,
  ) {
    return this.evaluationResultsService
      .getResultsForTeam(
        teamId,
      );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyResults(
    @Headers('authorization')
    authorization: string,
  ) {
    return this.evaluationResultsService
      .getMyResults(
        authorization,
      );
  }
}
