import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhaseStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';

@Injectable()
export class PhasesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.phase.create({
      data: {
        workspaceId,
        name: dto.name.trim(),
        creditHours: dto.creditHours,
        description: dto.description?.trim() || null,
        status: dto.status ?? PhaseStatus.ACTIVE,
        sortOrder: dto.sortOrder ?? 0,
      },
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

    return this.prisma.phase.update({
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

    return { success: true };
  }
}
