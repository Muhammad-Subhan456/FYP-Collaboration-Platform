import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SubmissionsService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly activityLogsService: ActivityLogsService,
  private readonly httpService: HttpService,
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

  if (!deliverable.isActive) {
    throw new BadRequestException(
      'Deliverable is no longer active',
    );
  }

  if (new Date() > deliverable.dueDate) {
    throw new BadRequestException(
      'Submission deadline has passed',
    );
  }

  const existingSubmissions =
    await this.prisma.submission.findMany({
      where: {
        deliverableId:
          dto.deliverableId,

        teamId:
          dto.teamId,
      },
      orderBy: {
        version: 'desc',
      },
    });

  const nextVersion =
    existingSubmissions.length > 0
      ? existingSubmissions[0].version + 1
      : 1;

  const submission =
    await this.prisma.submission.create({
      data: {
        deliverableId:
          dto.deliverableId,

        teamId:
          dto.teamId,

        version:
          nextVersion,

        fileUrl:
          dto.fileUrl,

        remarks:
          dto.remarks,
      },
    });

  await this.activityLogsService.logActivity(
    dto.teamId,
    'Document Submitted',
    `${deliverable.title} (v${nextVersion})`,
  );

  try {
    await firstValueFrom(
      this.httpService.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
        {
          authUserId:
            deliverable.supervisorId,

          title:
            'New Submission Received',

          message:
            `A team submitted ${deliverable.title} (v${nextVersion}).`,
        },
      ),
    );
  } catch (error: any) {
    console.error(
      'Failed to notify supervisor',
      error.message,
    );
  }

  return submission;
}

  async getDeliverableSubmissions(deliverableId: string) {
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
  const submission =
    await this.prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
        deliverable: true,
      },
    });

  if (!submission) {
    throw new BadRequestException(
      'Submission not found',
    );
  }

  const updatedSubmission =
    await this.prisma.submission.update({
      where: {
        id: submissionId,
      },
      data: {
        status:
          dto.status as any,

        feedback:
          dto.feedback,

        grade:
          dto.grade,
      },
    });

  await this.activityLogsService.logActivity(
    submission.teamId,
    'Submission Reviewed',
    submission.deliverable.title,
  );

  try {
    const teamMembers =
      await firstValueFrom(
        this.httpService.get(
          `${process.env.TEAM_SERVICE_URL}/teams/${submission.teamId}/members`,
        ),
      );

    for (const member of teamMembers.data) {
      await firstValueFrom(
        this.httpService.post(
          `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
          {
            authUserId:
              member.authUserId,

            title:
              'Submission Reviewed',

            message:
              `Feedback has been provided for ${submission.deliverable.title}.`,
          },
        ),
      );
    }
  } catch (error: any) {
    console.error(
      'Failed to notify team',
      error.message,
    );
  }

  return updatedSubmission;
}

async getLatestSubmission(
  deliverableId: string,
  teamId: string,
) {
  return this.prisma.submission.findFirst({
    where: {
      deliverableId,
      teamId,
    },
    orderBy: {
      version: 'desc',
    },
  });
}

async getTeamSubmissions(
  teamId: string,
) {
  return this.prisma.submission.findMany({
    where: {
      teamId,
    },
    include: {
      deliverable: true,
    },
    orderBy: {
      submittedAt: 'desc',
    },
  });
}

}
