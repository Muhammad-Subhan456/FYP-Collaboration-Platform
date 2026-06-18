import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePanelDto } from './dto/create-panel.dto';
import { AddEvaluatorDto } from './dto/add-evaluator.dto';

@Injectable()
export class EvaluationPanelsService {
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
        try {
          await firstValueFrom(
            this.httpService.post(
              `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
              {
                authUserId: dto.evaluatorId,
                title: 'FOASIS Evaluation Panel Assignment',
                message: `You have been assigned as an evaluator for ${panel.evaluation.title} in room ${panel.room}.`,
              },
              { headers: this.internalHeaders() },
            ),
          );
        } catch (error: any) {
          console.error(
            'Failed to notify panel evaluator',
            error.message,
          );
        }
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
