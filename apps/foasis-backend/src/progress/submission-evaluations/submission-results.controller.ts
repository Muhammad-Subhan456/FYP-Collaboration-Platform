import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { ListResultsQueryDto } from './dto/list-submissions-query.dto';
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
}
