import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { DomainEventService } from '../../domain-events/domain-event.service';
import { DomainEvents } from '../../domain-events/domain-event.constants';
import type { LegacyEvaluationAssignedPayload } from '../../domain-events/domain-event.types';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { CreatePanelDto } from './dto/create-panel.dto';
import { AddEvaluatorDto } from './dto/add-evaluator.dto';

@Injectable()
export class EvaluationPanelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly domainEventService: DomainEventService,
  ) {}

  async createPanel(dto: CreatePanelDto) {
    const evaluation =
      await this.prisma.evaluation.findUnique({
        where: { id: dto.evaluationId },
      });

    if (!evaluation) {
      throw new BadRequestException(
        'Evaluation not found',
      );
    }

    return this.prisma.evaluationPanel.create({
      data: {
        evaluationId: dto.evaluationId,
        room: dto.room,
        scheduledAt: dto.scheduledAt
          ? new Date(dto.scheduledAt)
          : null,
        remarks: dto.remarks,
      },
      include: {
        evaluators: true,
      },
    });
  }

  async addEvaluator(
    panelId: string,
    dto: AddEvaluatorDto,
  ) {
    const panel =
      await this.prisma.evaluationPanel.findUnique({
        where: { id: panelId },
        include: { evaluation: true },
      });

    if (!panel || !panel.evaluation) {
      throw new BadRequestException(
        'Panel not found',
      );
    }

    const membership =
      await this.prisma.workspaceMembership.findFirst({
        where: {
          workspaceId: panel.evaluation.workspaceId,
          userId: dto.evaluatorId,
          role: {
            in: [UserRole.SUPERVISOR, UserRole.EVALUATOR],
          },
          isActive: true,
        },
      });

    if (!membership) {
      throw new BadRequestException(
        'Selected user is not an active supervisor or evaluator in this workspace',
      );
    }

    return this.prisma.panelEvaluator.create({
      data: {
        panelId,
        evaluatorId: dto.evaluatorId,
        role: dto.role ?? 'EVALUATOR',
      },
    }).then(async (evaluatorRecord) => {
      const route =
        membership.role === UserRole.EVALUATOR
          ? '/evaluator/evaluations'
          : '/supervisor/dashboard';

      await this.notificationDispatch.send({
        authUserId: dto.evaluatorId,
        title: 'FOASIS Evaluation Panel Assignment',
        message: `You have been assigned as an evaluator for ${panel.evaluation.title} in room ${panel.room}.`,
        type: 'EVALUATION_PANEL_ASSIGNED',
        entityType: 'EVALUATION',
        entityId: panel.evaluationId,
        route,
      });

      const realtimePayload: LegacyEvaluationAssignedPayload = {
        workspaceId: panel.evaluation.workspaceId,
        evaluationId: panel.evaluationId,
        teamId: '',
        title: panel.evaluation.title,
        date:
          panel.scheduledAt?.toISOString() ??
          panel.evaluation.date.toISOString(),
        venue: panel.room,
      };

      this.domainEventService.emitSafe({
        name: DomainEvents.EVALUATION_ASSIGNED,
        timestamp: new Date().toISOString(),
        scope: {
          type: 'workspace',
          id: panel.evaluation.workspaceId,
        },
        entity: { type: 'EVALUATION', id: panel.evaluationId },
        payload: realtimePayload,
      });

      return evaluatorRecord;
    });
  }

  async getPanelsForEvaluation(
    evaluationId: string,
  ) {
    return this.prisma.evaluationPanel.findMany({
      where: { evaluationId },
      include: {
        evaluators: true,
        assignments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMyPanels(evaluatorId: string) {
    return this.prisma.evaluationPanel.findMany({
      where: {
        evaluators: {
          some: {
            evaluatorId,
          },
        },
      },
      include: {
        evaluation: true,
        evaluators: true,
        assignments: true,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });
  }
}
