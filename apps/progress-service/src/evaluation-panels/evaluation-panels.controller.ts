import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { EvaluationPanelsService } from './evaluation-panels.service';
import { CreatePanelDto } from './dto/create-panel.dto';
import { AddEvaluatorDto } from './dto/add-evaluator.dto';

@Controller('evaluation-panels')
export class EvaluationPanelsController {
  constructor(
    private readonly evaluationPanelsService:
      EvaluationPanelsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Post()
  createPanel(@Body() dto: CreatePanelDto) {
    return this.evaluationPanelsService.createPanel(
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Post(':id/evaluators')
  addEvaluator(
    @Param('id') panelId: string,
    @Body() dto: AddEvaluatorDto,
  ) {
    return this.evaluationPanelsService.addEvaluator(
      panelId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('evaluation/:evaluationId')
  getPanelsForEvaluation(
    @Param('evaluationId') evaluationId: string,
  ) {
    return this.evaluationPanelsService.getPanelsForEvaluation(
      evaluationId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyPanels(@Req() req: any) {
    return this.evaluationPanelsService.getMyPanels(
      req.user.userId,
    );
  }
}
