import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { SubmissionsService } from './submissions.service';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { PaginationQueryDto } from '../../common/helpers/pagination';

@Controller('submissions')
export class SubmissionsController {
  constructor(
    private readonly submissionsService:
      SubmissionsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Post()
  createSubmission(
    @Req() req: any,
    @Headers('authorization') authorization: string,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.submissionsService.createSubmission(
      req.user.userId,
      authorization,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('my')
  getMySubmissions(
    @Headers('authorization') authorization: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.submissionsService.getMySubmissions(
      authorization,
      query.page,
      query.limit,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('finalized')
  getFinalizedSubmissions(
    @Req() req: { workspaceId: string },
    @Query('phaseId') phaseId?: string,
    @Query() query?: PaginationQueryDto,
  ) {
    return this.submissionsService.getFinalizedSubmissions(
      req.workspaceId,
      phaseId,
      query?.page,
      query?.limit,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get('deliverable/:id')
  getDeliverableSubmissions(
    @Req() req: any,
    @Param('id') deliverableId: string,
  ) {
    return this.submissionsService.getDeliverableSubmissions(
      deliverableId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get('detail/:submissionId')
  getSubmissionDetail(
    @Req() req: any,
    @Param('submissionId') submissionId: string,
  ) {
    return this.submissionsService.getSubmissionDetail(
      submissionId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Patch(':id/finalize')
  finalizeSubmission(
    @Req() req: any,
    @Param('id') submissionId: string,
  ) {
    return this.submissionsService.finalizeSubmission(
      submissionId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Patch(':id/review')
  reviewSubmission(
    @Req() req: any,
    @Param('id') submissionId: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.submissionsService.reviewSubmission(
      submissionId,
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':deliverableId/team/:teamId/latest')
  getLatestSubmission(
    @Req() req: any,
    @Headers('authorization') authorization: string,
    @Param('deliverableId') deliverableId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.submissionsService.getLatestSubmission(
      deliverableId,
      teamId,
      req.user.userId,
      req.user.role,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':deliverableId/team/:teamId/history')
  getSubmissionHistory(
    @Req() req: any,
    @Headers('authorization') authorization: string,
    @Param('deliverableId') deliverableId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.submissionsService.getSubmissionHistory(
      deliverableId,
      teamId,
      req.user.userId,
      req.user.role,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('team/:teamId')
  getTeamSubmissions(
    @Req() req: any,
    @Headers('authorization') authorization: string,
    @Param('teamId') teamId: string,
  ) {
    return this.submissionsService.getTeamSubmissions(
      teamId,
      req.user.userId,
      req.user.role,
      authorization,
    );
  }
}
