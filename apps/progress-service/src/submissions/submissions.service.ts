import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createSubmission(
    dto: CreateSubmissionDto,
  ) {
    const deliverable =
      await this.prisma.deliverable.findUnique({
        where: {
          id: dto.deliverableId,
        },
      });

    if (!deliverable) {
      throw new BadRequestException(
        'Deliverable not found',
      );
    }

    if (
      new Date() >
      deliverable.dueDate
    ) {
      throw new BadRequestException(
        'Submission deadline has passed',
      );
    }

    return this.prisma.submission.create({
      data: {
        deliverableId:
          dto.deliverableId,

        teamId:
          dto.teamId,

        fileUrl:
          dto.fileUrl,

        remarks:
          dto.remarks,
      },
    });
  }

  async getDeliverableSubmissions(
    deliverableId: string,
  ) {
    return this.prisma.submission.findMany({
      where: {
        deliverableId,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
  }

  async reviewSubmission(
    submissionId: string,
    dto: ReviewSubmissionDto,
  ) {
    return this.prisma.submission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: dto.status as any,

        feedback:
          dto.feedback,

        grade:
          dto.grade,
      },
    });
  }
}