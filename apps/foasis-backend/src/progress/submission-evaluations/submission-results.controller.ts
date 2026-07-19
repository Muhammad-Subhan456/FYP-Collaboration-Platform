import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { GpaCalculationService } from '../gpa/gpa-calculation.service';

import { ListResultsQueryDto } from './dto/list-submissions-query.dto';
import { PromoteGradeDto } from './dto/promote-grade.dto';
import { SubmissionResultsService } from './submission-results.service';

type AuthedRequest = {
  user: { userId: string; role?: string };
  workspaceId: string;
};

@Controller('submission-results')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionResultsController {
  constructor(
    private readonly submissionResultsService: SubmissionResultsService,
    private readonly gpaCalculationService: GpaCalculationService,
  ) {}

  @Get('my')
  @Roles('STUDENT')
  getMyResults(
    @Req() req: AuthedRequest,
    @Query() query: ListResultsQueryDto,
  ) {
    return this.submissionResultsService.getStudentResults(
      req.workspaceId,
      req.user.userId,
      {
        phaseId: query.phaseId,
        templateId: query.templateId,
      },
    );
  }

  @Get('supervisor')
  @Roles('SUPERVISOR')
  getSupervisorResults(
    @Req() req: AuthedRequest,
    @Query() query: ListResultsQueryDto,
  ) {
    return this.submissionResultsService.getSupervisorResults(
      req.workspaceId,
      req.user.userId,
      {
        phaseId: query.phaseId,
        templateId: query.templateId,
        teamId: query.teamId,
      },
    );
  }

  @Get('coordinator')
  @Roles('COORDINATOR')
  getCoordinatorResults(
    @Req() req: AuthedRequest,
    @Query() query: ListResultsQueryDto,
  ) {
    return this.submissionResultsService.getCoordinatorResults(
      req.workspaceId,
      {
        phaseId: query.phaseId,
        templateId: query.templateId,
        supervisorId: query.supervisorId,
        teamId: query.teamId,
        studentId: query.studentId,
        evaluatorId: query.evaluatorId,
      },
    );
  }

  @Post('promote')
  @Roles('SUPERVISOR', 'COORDINATOR')
  promoteGrade(
    @Req() req: AuthedRequest,
    @Body() body: PromoteGradeDto,
  ) {
    return this.gpaCalculationService.promoteStudentPhaseGrade(
      req.workspaceId,
      body.phaseId,
      body.studentId,
      { id: req.user.userId, role: req.user.role ?? '' },
    );
  }
}
