import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { SubmissionsService } from './submissions.service';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';

@Controller('submissions')
export class SubmissionsController {
  constructor(
    private readonly submissionsService:
      SubmissionsService,
  ) {}

  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles('STUDENT')
  @Post()
  createSubmission(
    @Body()
    dto: CreateSubmissionDto,
  ) {
    return this.submissionsService
      .createSubmission(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('deliverable/:id')
  getDeliverableSubmissions(
    @Param('id')
    deliverableId: string,
  ) {
    return this.submissionsService
      .getDeliverableSubmissions(
        deliverableId,
      );
  }

  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles('SUPERVISOR')
  @Patch(':id/review')
  reviewSubmission(
    @Param('id')
    submissionId: string,

    @Body()
    dto: ReviewSubmissionDto,
  ) {
    return this.submissionsService
      .reviewSubmission(
        submissionId,
        dto,
      );
  }

  @UseGuards(JwtAuthGuard)
  @Get(
    ':deliverableId/team/:teamId/latest',
  )
  getLatestSubmission(
    @Param('deliverableId')
    deliverableId: string,

    @Param('teamId')
    teamId: string,
  ) {
    return this.submissionsService
      .getLatestSubmission(
        deliverableId,
        teamId,
      );
  }

  @UseGuards(JwtAuthGuard)
  @Get('team/:teamId')
  getTeamSubmissions(
    @Param('teamId')
    teamId: string,
  ) {
    return this.submissionsService
      .getTeamSubmissions(
        teamId,
      );
  }
}