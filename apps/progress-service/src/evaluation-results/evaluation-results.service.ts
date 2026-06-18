import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
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

  private async assertEvaluatorAccess(
    evaluationId: string,
    teamId: string,
    evaluatorId: string,
  ) {
    const assignment =
      await this.prisma.evaluationAssignment.findFirst({
        where: {
          evaluationId,
          teamId,
        },
        include: {
          panel: {
            include: {
              evaluators: true,
            },
          },
        },
      });

    if (!assignment) {
      throw new BadRequestException(
        'Team is not assigned to this evaluation',
      );
    }

    if (!assignment.panelId || !assignment.panel) {
      throw new BadRequestException(
        'This team must be assigned to a panel before marks can be entered',
      );
    }

    const isEvaluator = assignment.panel.evaluators.some(
      (evaluator) =>
        evaluator.evaluatorId === evaluatorId,
    );

    if (!isEvaluator) {
      throw new ForbiddenException(
        'Only assigned panel evaluators can enter or update marks',
      );
    }
  }

  async createResult(
    evaluationId: string,
    evaluatorId: string,
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

    await this.assertEvaluatorAccess(
      evaluationId,
      dto.teamId,
      evaluatorId,
    );

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

      await Promise.allSettled(
        teamMembers.data.map((member: { authUserId: string }) =>
          firstValueFrom(
            this.httpService.post(
              `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
              {
                authUserId: member.authUserId,
                title: 'FOASIS Evaluation Result Published',
                message: `Your team received ${dto.marks} marks in ${evaluation.title}.`,
              },
              { headers: this.internalHeaders() },
            ),
          ),
        ),
      );
    } catch (error: any) {
      console.error(
        'Failed to create result notifications',
        error.message,
      );
    }

    return result;
  }

  async updateResult(
    resultId: string,
    evaluatorId: string,
    dto: UpdateResultDto,
  ) {
    const existing =
      await this.prisma.evaluationResult.findUnique({
        where: { id: resultId },
      });

    if (!existing) {
      throw new BadRequestException(
        'Result not found',
      );
    }

    await this.assertEvaluatorAccess(
      existing.evaluationId,
      existing.teamId,
      evaluatorId,
    );

    return this.prisma.evaluationResult.update({
      where: { id: resultId },
      data: {
        marks: dto.marks,
        comments: dto.comments,
      },
      include: { evaluation: true },
    }).then(async (updated) => {
      try {
        const teamMembers = await firstValueFrom(
          this.httpService.get(
            `${process.env.TEAM_SERVICE_URL}/teams/${updated.teamId}/members`,
            { headers: this.internalHeaders() },
          ),
        );

        await Promise.allSettled(
          teamMembers.data.map((member: { authUserId: string }) =>
            firstValueFrom(
              this.httpService.post(
                `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
                {
                  authUserId: member.authUserId,
                  title: 'FOASIS Evaluation Marks Updated',
                  message: `Your team marks for ${updated.evaluation.title} have been updated to ${dto.marks}.`,
                },
                { headers: this.internalHeaders() },
              ),
            ),
          ),
        );
      } catch (error: any) {
        console.error(
          'Failed to notify team of marks update',
          error.message,
        );
      }

      return updated;
    });
  }

  async getResultsForTeam(
    teamId: string,
    requesterId?: string,
    requesterRole?: string,
  ) {
    if (requesterRole === 'SUPERVISOR' && requesterId) {
      const assignment =
        await this.prisma.evaluationAssignment.findFirst({
          where: {
            teamId,
            panel: {
              evaluators: {
                some: {
                  evaluatorId: requesterId,
                },
              },
            },
          },
        });

      if (!assignment) {
        throw new ForbiddenException(
          'You can only view results for teams on your evaluation panels',
        );
      }
    }

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
    try {
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

      if (!team.data?.id) {
        return [];
      }

      return this.prisma.evaluationResult.findMany({
        where: {
          teamId: team.data.id,
        },
        include: {
          evaluation: true,
        },
      });
    } catch {
      return [];
    }
  }
}
