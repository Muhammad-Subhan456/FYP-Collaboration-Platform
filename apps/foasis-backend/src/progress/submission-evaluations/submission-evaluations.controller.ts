import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SubmissionEvaluationStatus } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { AssignEvaluatorDto, AssignEvaluatorsDto, SaveEvaluationDraftDto } from './dto/assign-evaluator.dto';
import { ListEligibleSubmissionsQueryDto } from './dto/list-submissions-query.dto';
import { SubmissionEvaluationsService } from './submission-evaluations.service';

type AuthedRequest = {
  user: { userId: string };
  workspaceId: string;
};

@Controller('submission-evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionEvaluationsController {
  constructor(
    private readonly submissionEvaluationsService: SubmissionEvaluationsService,
  ) {}

  @Get('eligible')
  @Roles('COORDINATOR')
  listEligible(
    @Req() req: AuthedRequest,
    @Query() query: ListEligibleSubmissionsQueryDto,
  ) {
    return this.submissionEvaluationsService.listEligibleSubmissions(
      req.workspaceId,
      {
        phaseId: query.phaseId,
        templateId: query.templateId,
        supervisorId: query.supervisorId,
        teamId: query.teamId,
        evaluationStatus: query.evaluationStatus,
        evaluatorId: query.evaluatorId,
      },
    );
  }

  @Get('evaluators')
  @Roles('COORDINATOR')
  listEvaluators(@Req() req: AuthedRequest) {
    return this.submissionEvaluationsService.listWorkspaceEvaluators(
      req.workspaceId,
    );
  }

  @Post('assign')
  @Roles('COORDINATOR')
  assignEvaluator(
    @Req() req: AuthedRequest,
    @Body() dto: AssignEvaluatorDto,
  ) {
    return this.submissionEvaluationsService.assignEvaluator(
      req.workspaceId,
      req.user.userId,
      dto,
    );
  }

  @Post('assign-many')
  @Roles('COORDINATOR')
  assignEvaluators(
    @Req() req: AuthedRequest,
    @Body() dto: AssignEvaluatorsDto,
  ) {
    return this.submissionEvaluationsService.assignEvaluators(
      req.workspaceId,
      req.user.userId,
      dto,
    );
  }

  @Get('my')
  @Roles('EVALUATOR')
  getMyEvaluations(
    @Req() req: AuthedRequest,
    @Query('status') status?: SubmissionEvaluationStatus,
  ) {
    return this.submissionEvaluationsService.getMyEvaluations(
      req.workspaceId,
      req.user.userId,
      status,
    );
  }

  @Get(':id')
  @Roles('EVALUATOR')
  getEvaluation(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ) {
    return this.submissionEvaluationsService.getEvaluationForEvaluator(
      req.workspaceId,
      id,
      req.user.userId,
    );
  }

  @Post(':id/draft')
  @Roles('EVALUATOR')
  saveDraft(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: SaveEvaluationDraftDto,
  ) {
    return this.submissionEvaluationsService.saveDraft(
      req.workspaceId,
      id,
      req.user.userId,
      dto,
    );
  }

  @Post(':id/submit')
  @Roles('EVALUATOR')
  submitEvaluation(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: SaveEvaluationDraftDto,
  ) {
    return this.submissionEvaluationsService.submitEvaluation(
      req.workspaceId,
      id,
      req.user.userId,
      dto,
    );
  }
}
