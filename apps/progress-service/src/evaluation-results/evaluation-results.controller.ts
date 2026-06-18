import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  Headers,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
  @Roles('SUPERVISOR')
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
  @Roles('SUPERVISOR')
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

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyResults(
    @Headers('authorization')
    authorization: string,
  ) {
    return this.evaluationResultsService.getMyResults(
      authorization,
    );
  }
}
