import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EvaluationsService {
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

  async createEvaluation(
    coordinatorId: string,
    dto: CreateEvaluationDto,
  ) {
    return this.prisma.evaluation.create({
      data: {
        coordinatorId,
        title: dto.title,
        type: dto.type as any,
        date: new Date(dto.date),
        venue: dto.venue,
        remarks: dto.remarks,
      },
    });
  }

  async getAllEvaluations() {
    return this.prisma.evaluation.findMany({
      orderBy: {
        date: 'asc',
      },
    });
  }

  async assignTeam(
    evaluationId: string,
    teamId: string,
    panelId?: string,
  ) {
    const existingAssignment =
      await this.prisma.evaluationAssignment.findFirst({
        where: {
          evaluationId,
          teamId,
        },
      });

    if (existingAssignment) {
      throw new BadRequestException(
        'Team already assigned to this evaluation',
      );
    }

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

    if (panelId) {
      const panel =
        await this.prisma.evaluationPanel.findUnique({
          where: { id: panelId },
        });

      if (!panel || panel.evaluationId !== evaluationId) {
        throw new BadRequestException(
          'Panel not found for this evaluation',
        );
      }
    }

    const assignment =
      await this.prisma.evaluationAssignment.create({
        data: {
          evaluationId,
          teamId,
          panelId,
        },
      });

    try {
      const team = await firstValueFrom(
        this.httpService.get(
          `${process.env.TEAM_SERVICE_URL}/teams/${teamId}/members`,
          { headers: this.internalHeaders() },
        ),
      );

      const members = team.data;

      for (const member of members) {
        await firstValueFrom(
          this.httpService.post(
            `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
            {
              authUserId: member.authUserId,
              title: 'Evaluation Scheduled',
              message: `Your team has been scheduled for ${evaluation.title} on ${evaluation.date.toDateString()} at ${evaluation.venue}.`,
            },
            { headers: this.internalHeaders() },
          ),
        );
      }
    } catch (error: any) {
      console.error(
        'Failed to create notifications',
        error.message,
      );
    }

    return assignment;
  }

  async getTeamEvaluations(teamId: string) {
    return this.prisma.evaluationAssignment.findMany({
      where: {
        teamId,
      },
      include: {
        evaluation: true,
      },
    });
  }

  async getMyEvaluations(authorization: string) {
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

    const teamId = team.data.id;

    return this.prisma.evaluationAssignment.findMany({
      where: {
        teamId,
      },
      include: {
        evaluation: true,
      },
    });
  }
}
