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
    return this.assignTeams(evaluationId, [teamId], panelId);
  }

  async assignTeams(
    evaluationId: string,
    teamIds: string[],
    panelId?: string,
  ) {
    const uniqueTeamIds = [...new Set(teamIds)];

    const evaluation =
      await this.prisma.evaluation.findUnique({
        where: { id: evaluationId },
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

    const assignments: Awaited<
      ReturnType<typeof this.prisma.evaluationAssignment.create>
    >[] = [];

    for (const teamId of uniqueTeamIds) {
      const existingAssignment =
        await this.prisma.evaluationAssignment.findFirst({
          where: {
            evaluationId,
            teamId,
          },
        });

      if (existingAssignment) {
        throw new BadRequestException(
          `Team ${teamId} is already assigned to this evaluation`,
        );
      }

      const assignment =
        await this.prisma.evaluationAssignment.create({
          data: {
            evaluationId,
            teamId,
            panelId,
          },
        });

      assignments.push(assignment);

      try {
        const team = await firstValueFrom(
          this.httpService.get(
            `${process.env.TEAM_SERVICE_URL}/teams/${teamId}/members`,
            { headers: this.internalHeaders() },
          ),
        );

        const members = team.data;

        await Promise.allSettled(
          members.map((member: { authUserId: string }) =>
            firstValueFrom(
              this.httpService.post(
                `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
                {
                  authUserId: member.authUserId,
                  title: 'FOASIS Evaluation Scheduled',
                  message: `Your team has been scheduled for ${evaluation.title} on ${evaluation.date.toDateString()} at ${evaluation.venue}.`,
                },
                { headers: this.internalHeaders() },
              ),
            ),
          ),
        );
      } catch (error: any) {
        console.error(
          'Failed to create evaluation assignment notifications',
          error.message,
        );
      }
    }

    return assignments;
  }

  async getEvaluationAssignments(evaluationId: string) {
    const evaluation =
      await this.prisma.evaluation.findUnique({
        where: { id: evaluationId },
      });

    if (!evaluation) {
      throw new BadRequestException(
        'Evaluation not found',
      );
    }

    return this.prisma.evaluationAssignment.findMany({
      where: { evaluationId },
      orderBy: { createdAt: 'asc' },
    });
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

      const teamId = team.data.id;

      return this.prisma.evaluationAssignment.findMany({
        where: {
          teamId,
        },
        include: {
          evaluation: true,
        },
      });
    } catch {
      return [];
    }
  }

  async getEvaluatorOverview() {
    const panelEvaluators =
      await this.prisma.panelEvaluator.findMany({
        include: {
          panel: {
            include: {
              evaluation: true,
              assignments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

    const overview = new Map<
      string,
      {
        evaluatorId: string;
        teams: Array<{
          teamId: string;
          evaluationId: string;
          evaluationTitle: string;
          panelRoom: string;
        }>;
      }
    >();

    for (const record of panelEvaluators) {
      if (!overview.has(record.evaluatorId)) {
        overview.set(record.evaluatorId, {
          evaluatorId: record.evaluatorId,
          teams: [],
        });
      }

      const entry = overview.get(record.evaluatorId)!;

      for (const assignment of record.panel.assignments) {
        const exists = entry.teams.some(
          (team) =>
            team.teamId === assignment.teamId &&
            team.evaluationId === record.panel.evaluationId,
        );

        if (!exists) {
          entry.teams.push({
            teamId: assignment.teamId,
            evaluationId: record.panel.evaluationId,
            evaluationTitle: record.panel.evaluation.title,
            panelRoom: record.panel.room,
          });
        }
      }
    }

    return Array.from(overview.values());
  }
}
