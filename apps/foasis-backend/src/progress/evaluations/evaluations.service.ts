import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { TeamsService } from '../../teams/teams.service';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { AuthContextService } from '../../common/auth-context.service';
import { DomainEvents } from '../../domain-events/domain-event.constants';
import { DomainEventService } from '../../domain-events/domain-event.service';
import type { LegacyEvaluationAssignedPayload } from '../../domain-events/domain-event.types';

@Injectable()
export class EvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly authContext: AuthContextService,
    private readonly domainEventService: DomainEventService,
  ) {}

  async createEvaluation(
    coordinatorId: string,
    dto: CreateEvaluationDto,
    workspaceId: string,
  ) {
    return this.prisma.evaluation.create({
      data: {
        coordinatorId,
        workspaceId,
        title: dto.title,
        type: dto.type as any,
        date: new Date(dto.date),
        venue: dto.venue,
        remarks: dto.remarks,
      },
    });
  }

  async getAllEvaluations(workspaceId: string) {
    return this.prisma.evaluation.findMany({
      where: { workspaceId },
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
      const team = await this.prisma.team.findFirst({
        where: {
          id: teamId,
          workspaceId: evaluation.workspaceId,
        },
        select: { id: true },
      });

      if (!team) {
        throw new BadRequestException(
          'One or more teams do not belong to this workspace',
        );
      }

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
        const members =
          await this.teamsService.getTeamMembers(teamId);

        await Promise.allSettled(
          members.map((member) =>
            this.notificationDispatch.send({
              authUserId: member.authUserId,
              title: 'FOASIS Evaluation Scheduled',
              message: `Your team has been scheduled for ${evaluation.title} on ${evaluation.date.toDateString()} at ${evaluation.venue}.`,
              type: 'EVALUATION_ASSIGNED',
              entityType: 'EVALUATION',
              entityId: evaluationId,
              route: '/student/evaluations',
            }),
          ),
        );

        const proposal = await this.prisma.proposal.findFirst({
          where: { teamId },
          select: { assignedSupervisorId: true },
        });

        if (proposal?.assignedSupervisorId) {
          await this.notificationDispatch.send({
            authUserId: proposal.assignedSupervisorId,
            title: 'FOASIS Evaluation Scheduled',
            message: `A supervised team has been scheduled for ${evaluation.title} on ${evaluation.date.toDateString()} at ${evaluation.venue}.`,
            type: 'EVALUATION_ASSIGNED',
            entityType: 'EVALUATION',
            entityId: evaluationId,
            route: '/supervisor/dashboard',
          });
        }
      } catch (error: any) {
        console.error(
          'Failed to create evaluation assignment notifications',
          error.message,
        );
      }

      this.domainEventService.emitSafe<LegacyEvaluationAssignedPayload>({
        name: DomainEvents.EVALUATION_ASSIGNED,
        timestamp: new Date().toISOString(),
        scope: { type: 'workspace', id: evaluation.workspaceId },
        entity: { type: 'EVALUATION', id: evaluationId },
        payload: {
          workspaceId: evaluation.workspaceId,
          evaluationId,
          teamId,
          title: evaluation.title,
          date: evaluation.date.toISOString(),
          venue: evaluation.venue,
        },
      });
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
      const authUserId =
        this.authContext.getUserIdFromAuthorization(
          authorization,
        );

      return this.getMyEvaluationsByUserId(authUserId);
    } catch {
      return [];
    }
  }

  async getMyEvaluationsByUserId(
    authUserId: string,
    teamId?: string | null,
  ) {
    const resolvedTeamId =
      teamId ??
      (await this.teamsService.getMyTeam(authUserId))?.id;

    if (!resolvedTeamId) {
      return [];
    }

    return this.getTeamEvaluations(resolvedTeamId);
  }

  async getEvaluatorOverview(workspaceId: string) {
    const panelEvaluators =
      await this.prisma.panelEvaluator.findMany({
        where: {
          panel: { evaluation: { workspaceId } },
        },
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
