import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { CreatePanelDto } from './dto/create-panel.dto';
import { AddEvaluatorDto } from './dto/add-evaluator.dto';

@Injectable()
export class EvaluationPanelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatch: NotificationDispatchService,
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
      });

    if (!panel) {
      throw new BadRequestException(
        'Panel not found',
      );
    }

    return this.prisma.panelEvaluator.create({
      data: {
        panelId,
        evaluatorId: dto.evaluatorId,
        role: dto.role ?? 'EVALUATOR',
      },
    }).then(async (evaluatorRecord) => {
      const panel =
        await this.prisma.evaluationPanel.findUnique({
          where: { id: panelId },
          include: { evaluation: true },
        });

      if (panel?.evaluation) {
        await this.notificationDispatch.send({
          authUserId: dto.evaluatorId,
          title: 'FOASIS Evaluation Panel Assignment',
          message: `You have been assigned as an evaluator for ${panel.evaluation.title} in room ${panel.room}.`,
          type: 'EVALUATION_PANEL_ASSIGNED',
          entityType: 'EVALUATION',
          entityId: panel.evaluationId,
          route: '/supervisor/evaluations',
        });
      }

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
