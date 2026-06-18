import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateResultDto } from './dto/create-result.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EvaluationResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  private internalHeaders() {
    return {
      'X-Internal-Api-Key':
        process.env.INTERNAL_API_KEY,
    };
  }

  async createResult(
    evaluationId: string,
    dto: CreateResultDto,
  ) {
    const evaluation =
      await this.prisma.evaluation.findUnique({
        where: {
          id: evaluationId,
        },
      });

    if (!evaluation) {
      throw new BadRequestException(
        'Evaluation not found',
      );
    }

    const existingResult =
      await this.prisma.evaluationResult.findFirst({
        where: {
          evaluationId,
          teamId: dto.teamId,
        },
      });

    if (existingResult) {
      throw new BadRequestException(
        'Result already exists',
      );
    }

    const result =
      await this.prisma.evaluationResult.create({
        data: {
          evaluationId,
          teamId: dto.teamId,
          marks: dto.marks,
          comments: dto.comments,
        },
      });

    try {
      const teamMembers = await firstValueFrom(
        this.httpService.get(
          `${process.env.TEAM_SERVICE_URL}/teams/${dto.teamId}/members`,
          { headers: this.internalHeaders() },
        ),
      );

      for (const member of teamMembers.data) {
        await firstValueFrom(
          this.httpService.post(
            `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
            {
              authUserId: member.authUserId,
              title: 'Evaluation Result Published',
              message: `Your team received ${dto.marks} marks in ${evaluation.title}.`,
            },
            { headers: this.internalHeaders() },
          ),
        );
      }
    } catch (error: any) {
      console.error(
        'Failed to create result notifications',
        error.message,
      );
    }

    return result;
  }

  async getResultsForTeam(teamId: string) {
    return this.prisma.evaluationResult.findMany({
      where: {
        teamId,
      },
      include: {
        evaluation: true,
      },
    });
  }

  async getMyResults(authorization: string) {
    const team = await firstValueFrom(
      this.httpService.get(
        `${process.env.TEAM_SERVICE_URL}/teams/my-team`,
        {
          headers: {
            authorization,
          },
        },
      ),
    );

    return this.prisma.evaluationResult.findMany({
      where: {
        teamId: team.data.id,
      },
      include: {
        evaluation: true,
      },
    });
  }
}
