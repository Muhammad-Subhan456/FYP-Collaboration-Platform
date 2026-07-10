import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembershipBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureEvaluatorMembership(
    workspaceId: string,
    userId: string,
  ) {
    await this.prisma.workspaceMembership.upsert({
      where: {
        workspaceId_userId_role: {
          workspaceId,
          userId,
          role: UserRole.EVALUATOR,
        },
      },
      create: {
        workspaceId,
        userId,
        role: UserRole.EVALUATOR,
        isActive: true,
      },
      update: {
        isActive: true,
      },
    });
  }

  async ensureEvaluatorForSupervisorMembership(
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) {
    if (role !== UserRole.SUPERVISOR) {
      return;
    }

    await this.ensureEvaluatorMembership(workspaceId, userId);
  }
}
