import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { InvitationsService } from '../invitations/invitations.service';
import { PrismaService } from '../prisma/prisma.service';

import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitationsService: InvitationsService,
  ) {}

  async list(includeArchived = false) {
    return this.prisma.workspace.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { teams: true },
        },
      },
    });
  }

  async findById(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        _count: {
          select: { teams: true },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  async create(dto: CreateWorkspaceDto, invitedById: string) {
    const slug = dto.slug.trim().toLowerCase();
    const coordinatorEmail = dto.coordinatorEmail.trim().toLowerCase();

    const existingSlug = await this.prisma.workspace.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      throw new BadRequestException('Workspace slug already exists');
    }

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name.trim(),
        slug,
        coordinatorEmail,
        description: dto.description?.trim() || null,
      },
    });

    await this.ensureCoordinatorAccess(
      workspace.id,
      coordinatorEmail,
      invitedById,
    );

    return workspace;
  }

  async update(
    id: string,
    dto: UpdateWorkspaceDto,
    invitedById: string,
  ) {
    await this.findById(id);

    if (dto.slug) {
      const slug = dto.slug.trim().toLowerCase();
      const conflict = await this.prisma.workspace.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (conflict) {
        throw new BadRequestException('Workspace slug already exists');
      }
    }

    const coordinatorEmail = dto.coordinatorEmail
      ?.trim()
      .toLowerCase();

    const workspace = await this.prisma.workspace.update({
      where: { id },
      data: {
        ...(dto.name !== undefined
          ? { name: dto.name.trim() }
          : {}),
        ...(dto.slug !== undefined
          ? { slug: dto.slug.trim().toLowerCase() }
          : {}),
        ...(coordinatorEmail !== undefined
          ? { coordinatorEmail }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
      },
    });

    if (coordinatorEmail) {
      await this.ensureCoordinatorAccess(
        workspace.id,
        coordinatorEmail,
        invitedById,
      );
    }

    return workspace;
  }

  async archive(id: string) {
    await this.findById(id);

    return this.prisma.workspace.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async restore(id: string) {
    await this.findById(id);

    return this.prisma.workspace.update({
      where: { id },
      data: { isArchived: false },
    });
  }

  private async ensureCoordinatorAccess(
    workspaceId: string,
    coordinatorEmail: string,
    invitedById: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: coordinatorEmail },
    });

    if (user) {
      await this.linkCoordinatorIfExists(workspaceId, coordinatorEmail);
      return;
    }

    await this.invitationsService.createInvitation(
      workspaceId,
      invitedById,
      {
        email: coordinatorEmail,
        role: UserRole.COORDINATOR,
      },
    );
  }

  private async linkCoordinatorIfExists(
    workspaceId: string,
    coordinatorEmail: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: coordinatorEmail },
    });

    if (!user) {
      return;
    }

    await this.prisma.workspaceMembership.upsert({
      where: {
        workspaceId_userId_role: {
          workspaceId,
          userId: user.id,
          role: UserRole.COORDINATOR,
        },
      },
      create: {
        workspaceId,
        userId: user.id,
        role: UserRole.COORDINATOR,
      },
      update: {
        role: UserRole.COORDINATOR,
        isActive: true,
      },
    });

    if (user.role !== UserRole.SUPER_ADMIN) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.COORDINATOR },
      });
    }
  }

  async getSystemHealth() {
    const timestamp = new Date().toISOString();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      const roleCounts = await this.prisma.user.groupBy({
        by: ['role'],
        where: {
          role: { not: UserRole.SUPER_ADMIN },
        },
        _count: { _all: true },
      });

      const usersByRole = roleCounts.map((row) => ({
        role: row.role,
        count: row._count._all,
      }));

      const registeredUsers = usersByRole.reduce(
        (sum, row) => sum + row.count,
        0,
      );

      return {
        status: 'ok',
        service: 'foasis-backend',
        database: 'connected',
        registeredUsers,
        usersByRole,
        services: [
          {
            name: 'foasis-backend',
            status: 'ok',
            database: 'connected',
            timestamp,
          },
        ],
        timestamp,
      };
    } catch {
      return {
        status: 'error',
        service: 'foasis-backend',
        database: 'disconnected',
        registeredUsers: 0,
        usersByRole: [],
        services: [
          {
            name: 'foasis-backend',
            status: 'error',
            database: 'disconnected',
            timestamp,
          },
        ],
        timestamp,
      };
    }
  }
}
