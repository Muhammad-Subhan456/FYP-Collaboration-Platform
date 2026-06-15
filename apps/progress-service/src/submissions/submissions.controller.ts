import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { SubmissionsService } from './submissions.service';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';

@Controller('submissions')
export class SubmissionsController {
  constructor(
    private readonly submissionsService:
      SubmissionsService,
  ) {}

  @Post()
  createSubmission(
    @Body()
    dto: CreateSubmissionDto,
  ) {
    return this.submissionsService
      .createSubmission(dto);
  }

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
}