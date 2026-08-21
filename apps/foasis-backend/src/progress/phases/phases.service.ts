import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhaseStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { DomainEvents } from '../../domain-events/domain-event.constants';
import { DomainEventService } from '../../domain-events/domain-event.service';
import type { PhaseRealtimePayload } from '../../domain-events/domain-event.types';
import { GpaCalculationService } from '../gpa/gpa-calculation.service';

import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';

@Injectable()
export class PhasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gpaCalculationService: GpaCalculationService,
    private readonly domainEventService: DomainEventService,
  ) {}

  private emitPhaseEvent(
    name:
      | typeof DomainEvents.PHASE_CREATED
      | typeof DomainEvents.PHASE_UPDATED
      | typeof DomainEvents.PHASE_CONFIGURATION_PUBLISHED
      | typeof DomainEvents.PHASE_DELETED,
    workspaceId: string,
    phase: {
      id: string;
      name: string;
      status: string;
      isConfigurationPublished: boolean;
    },
  ) {
    this.domainEventService.emitSafe<PhaseRealtimePayload>({
      name,
      timestamp: new Date().toISOString(),
      scope: { type: 'workspace', id: workspaceId },
      entity: { type: 'PHASE', id: phase.id },
      payload: {
        workspaceId,
        phaseId: phase.id,
        name: phase.name,
        status: phase.status,
        isConfigurationPublished: phase.isConfigurationPublished,
      },
    });
  }

  listPhases(workspaceId: string, status?: PhaseStatus) {
    return this.prisma.phase.findMany({
      where: {
        workspaceId,
        ...(status ? { status } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            templates: true,
            deliverables: true,
          },
        },
      },
    });
  }

  getPhase(phaseId: string) {
    return this.prisma.phase.findFirst({
      where: { id: phaseId },
      include: {
        _count: {
          select: {
            templates: true,
            deliverables: true,
          },
        },
      },
    });
  }

  async createPhase(workspaceId: string, dto: CreatePhaseDto) {
    const existing = await this.prisma.phase.findFirst({
      where: {
        workspaceId,
        name: dto.name.trim(),
      },
    });

    if (existing) {
      throw new BadRequestException(
        'A phase with this name already exists in the workspace',
      );
    }

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const maxOrder = await this.prisma.phase.aggregate({
        where: { workspaceId },
        _max: { sortOrder: true },
      });
      sortOrder =
        maxOrder._max.sortOrder == null ? 0 : maxOrder._max.sortOrder + 1;
    }

    return this.prisma.phase.create({
      data: {
        workspaceId,
        name: dto.name.trim(),
        creditHours: dto.creditHours,
        description: dto.description?.trim() || null,
        status: dto.status ?? PhaseStatus.ACTIVE,
        sortOrder,
      },
    }).then((phase) => {
      this.emitPhaseEvent(DomainEvents.PHASE_CREATED, workspaceId, phase);
      return phase;
    });
  }

  async updatePhase(phaseId: string, dto: UpdatePhaseDto) {
    const phase = await this.prisma.phase.findFirst({
      where: { id: phaseId },
    });

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    if (dto.name && dto.name.trim() !== phase.name) {
      const duplicate = await this.prisma.phase.findFirst({
        where: {
          workspaceId: phase.workspaceId,
          name: dto.name.trim(),
          NOT: { id: phaseId },
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          'A phase with this name already exists in the workspace',
        );
      }
    }

    const updated = await this.prisma.phase.update({
      where: { id: phaseId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.creditHours !== undefined && {
          creditHours: dto.creditHours,
        }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    this.emitPhaseEvent(
      DomainEvents.PHASE_UPDATED,
      updated.workspaceId,
      updated,
    );

    return updated;
  }

  async validatePhaseWeightages(phaseId: string) {
    const templates = await this.prisma.deliverableTemplate.findMany({
      where: { phaseId },
      select: { id: true, title: true, weightagePercent: true },
    });

    if (!templates.length) {
      throw new BadRequestException(
        'Add at least one deliverable template before publishing phase configuration',
      );
    }

    const totalWeightage = templates.reduce(
      (sum, template) => sum + Number(template.weightagePercent),
      0,
    );

    if (Math.abs(totalWeightage - 100) > 0.01) {
      throw new BadRequestException(
        `Deliverable weightages must total 100%. Current total: ${totalWeightage}%`,
      );
    }

    return {
      totalWeightage,
      templateCount: templates.length,
      templates: templates.map((template) => ({
        id: template.id,
        title: template.title,
        weightagePercent: Number(template.weightagePercent),
      })),
      isValid: Math.abs(totalWeightage - 100) <= 0.01,
    };
  }

  async publishPhaseConfiguration(phaseId: string) {
    const phase = await this.prisma.phase.findFirst({
      where: { id: phaseId },
    });

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    const validation = await this.validatePhaseWeightages(phaseId);

    const updated = await this.prisma.phase.update({
      where: { id: phaseId },
      data: {
        isConfigurationPublished: true,
        status: PhaseStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    await this.gpaCalculationService.recalculateForPhase(
      phase.workspaceId,
      phaseId,
    );

    this.emitPhaseEvent(
      DomainEvents.PHASE_CONFIGURATION_PUBLISHED,
      phase.workspaceId,
      updated,
    );

    return {
      phase: updated,
      validation,
    };
  }

  async recalculatePhaseGpa(workspaceId: string, phaseId: string) {
    const phase = await this.prisma.phase.findFirst({
      where: { id: phaseId, workspaceId },
    });

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    await this.gpaCalculationService.recalculateForPhase(
      workspaceId,
      phaseId,
    );

    const results = await this.prisma.studentPhaseResult.findMany({
      where: { workspaceId, phaseId },
      select: {
        studentId: true,
        weightedMarks: true,
        gpa: true,
        isComplete: true,
      },
    });

    return {
      phaseId,
      recalculated: results.length,
      results,
    };
  }

  async deletePhase(phaseId: string) {
    const phase = await this.prisma.phase.findFirst({
      where: { id: phaseId },
      include: {
        _count: {
          select: {
            templates: true,
            deliverables: true,
          },
        },
      },
    });

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    if (
      phase._count.templates > 0 ||
      phase._count.deliverables > 0
    ) {
      throw new BadRequestException(
        'Cannot delete a phase that has templates or deliverables',
      );
    }

    await this.prisma.phase.delete({
      where: { id: phaseId },
    });

    this.emitPhaseEvent(
      DomainEvents.PHASE_DELETED,
      phase.workspaceId,
      phase,
    );

    return { success: true };
  }
}
