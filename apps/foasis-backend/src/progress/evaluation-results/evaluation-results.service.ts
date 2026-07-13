import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { TeamsService } from '../../teams/teams.service';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { AuthContextService } from '../../common/auth-context.service';
import { DomainEvents } from '../../domain-events/domain-event.constants';
import { DomainEventService } from '../../domain-events/domain-event.service';
import type { LegacyResultPayload } from '../../domain-events/domain-event.types';

@Injectable()
export class EvaluationResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly authContext: AuthContextService,
    private readonly domainEventService: DomainEventService,
  ) {}

  private async notifyTeam(
    teamId: string,
    context: {
      title: string;
      message: string;
      type: string;
      entityType: string;
      entityId: string;
      route: string;
    },
  ) {
    try {
      const members =
        await this.teamsService.getTeamMembers(teamId);

      await Promise.allSettled(
        members.map((member) =>
          this.notificationDispatch.send({
            authUserId: member.authUserId,
            ...context,
          }),
        ),
      );
    } catch (error: any) {
      console.error(
        'Failed to notify team members',
        error.message,
      );
    }
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

    const team = await this.prisma.team.findFirst({
      where: {
        id: dto.teamId,
        workspaceId: evaluation.workspaceId,
      },
      select: { id: true },
    });

    if (!team) {
      throw new BadRequestException(
        'Team does not belong to this workspace',
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

    await this.notifyTeam(dto.teamId, {
      title: 'FOASIS Evaluation Result Published',
      message: `Your team received ${dto.marks} marks in ${evaluation.title}.`,
      type: 'RESULT_PUBLISHED',
      entityType: 'EVALUATION_RESULT',
      entityId: result.id,
      route: '/student/results',
    });

    this.domainEventService.emitSafe<LegacyResultPayload>({
      name: DomainEvents.RESULT_PUBLISHED,
      timestamp: new Date().toISOString(),
      actorId: evaluatorId,
      scope: { type: 'workspace', id: evaluation.workspaceId },
      entity: { type: 'EVALUATION_RESULT', id: result.id },
      payload: {
        workspaceId: evaluation.workspaceId,
        evaluationId,
        teamId: dto.teamId,
        resultId: result.id,
        marks: dto.marks,
      },
    });

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
      await this.notifyTeam(updated.teamId, {
        title: 'FOASIS Evaluation Marks Updated',
        message: `Your team marks for ${updated.evaluation.title} have been updated to ${dto.marks}.`,
        type: 'RESULT_UPDATED',
        entityType: 'EVALUATION_RESULT',
        entityId: updated.id,
        route: '/student/results',
      });

      this.domainEventService.emitSafe<LegacyResultPayload>({
        name: DomainEvents.RESULT_UPDATED,
        timestamp: new Date().toISOString(),
        actorId: evaluatorId,
        scope: {
          type: 'workspace',
          id: updated.evaluation.workspaceId,
        },
        entity: { type: 'EVALUATION_RESULT', id: updated.id },
        payload: {
          workspaceId: updated.evaluation.workspaceId,
          evaluationId: updated.evaluationId,
          teamId: updated.teamId,
          resultId: updated.id,
          marks: dto.marks ?? updated.marks,
        },
      });

      return updated;
    });
  }

  async getResultsForTeam(
    teamId: string,
    requesterId?: string,
    requesterRole?: string,
  ) {
    if (requesterRole === 'SUPERVISOR' && requesterId) {
      const supervised = await this.prisma.proposal.findFirst({
        where: {
          teamId,
          assignedSupervisorId: requesterId,
        },
        select: { id: true },
      });

      if (!supervised) {
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
            'You can only view results for teams you supervise or evaluate',
          );
        }
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

  async getCoordinatorOverview(workspaceId: string) {
    const [assignments, results] = await Promise.all([
      this.prisma.evaluationAssignment.findMany({
        where: { evaluation: { workspaceId } },
        include: { evaluation: true },
        orderBy: [
          { evaluation: { date: 'asc' } },
          { teamId: 'asc' },
        ],
      }),
      this.prisma.evaluationResult.findMany({
        where: { evaluation: { workspaceId } },
      }),
    ]);

    const resultMap = new Map(
      results.map((result) => [
        `${result.evaluationId}:${result.teamId}`,
        result,
      ]),
    );

    return assignments.map((assignment) => {
      const result = resultMap.get(
        `${assignment.evaluationId}:${assignment.teamId}`,
      );

      return {
        evaluationId: assignment.evaluationId,
        evaluationTitle: assignment.evaluation.title,
        evaluationType: assignment.evaluation.type,
        evaluationDate: assignment.evaluation.date,
        evaluationVenue: assignment.evaluation.venue,
        teamId: assignment.teamId,
        marks: result?.marks ?? null,
        resultId: result?.id ?? null,
        evaluated: !!result,
      };
    });
  }

  async getMyResults(authorization: string) {
    try {
      const authUserId =
        this.authContext.getUserIdFromAuthorization(
          authorization,
        );

      return this.getMyResultsByUserId(authUserId);
    } catch {
      return [];
    }
  }

  async getMyResultsByUserId(
    authUserId: string,
    teamId?: string | null,
  ) {
    const resolvedTeamId =
      teamId ??
      (await this.teamsService.getMyTeam(authUserId))?.id;

    if (!resolvedTeamId) {
      return [];
    }

    return this.getResultsByTeamIds([resolvedTeamId]);
  }

  async getResultsByTeamIds(teamIds: string[]) {
    if (!teamIds.length) {
      return [];
    }

    return this.prisma.evaluationResult.findMany({
      where: {
        teamId: { in: teamIds },
      },
      include: {
        evaluation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}