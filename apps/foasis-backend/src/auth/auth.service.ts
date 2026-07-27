import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import type { StringValue } from 'ms';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import {
  buildRoleNotification,
} from '../common/helpers/notification-payload';
import { DomainEventService } from '../domain-events/domain-event.service';
import { DomainEvents } from '../domain-events/domain-event.constants';
import type {
  UserRoleUpdatedPayload,
  UserStatusUpdatedPayload,
} from '../domain-events/domain-event.types';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { DEFAULT_WORKSPACE_ID } from '../workspace/workspace.constants';
import { WorkspaceContextService } from '../workspace/workspace-context.service';
import { AUTH_TOKEN_TYPES } from './auth.constants';
import { AppUrlsService } from '../common/app-urls.service';
import { EmailService } from '../email/email.service';
import { buildPasswordResetEmail } from '../email/email.templates';
import {
  generateSecureToken,
  hashToken,
} from '../common/helpers/secure-token';
import { LoginAttemptService } from './login-attempt.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
  private readonly prisma: PrismaService,
  private readonly jwtService: JwtService,
  private readonly notificationDispatch: NotificationDispatchService,
  private readonly domainEventService: DomainEventService,
  private readonly workspaceContext: WorkspaceContextService,
  private readonly config: ConfigService,
  private readonly emailService: EmailService,
  private readonly appUrls: AppUrlsService,
  private readonly loginAttempts: LoginAttemptService,
) {}

  private async notifyUser(
    authUserId: string,
    title: string,
    message: string,
    type: string,
    role: string,
  ) {
    await this.notificationDispatch.send(
      buildRoleNotification(
        authUserId,
        role,
        title,
        message,
        type,
      ),
    );
  }

  async register(registerDto: RegisterDto) {
    const allowOpenRegistration =
      this.config.get<string>('ALLOW_OPEN_REGISTRATION') === 'true';

    if (!allowOpenRegistration) {
      throw new ForbiddenException(
        'Open registration is disabled. Please use your invitation link.',
      );
    }
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: registerDto.email,
      },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      10,
    );

    const user = await this.prisma.user.create({
      data: {
        fullName: registerDto.fullName,
        email: registerDto.email,
        passwordHash: hashedPassword,
        role: UserRole.STUDENT,
        memberships: {
          create: {
            workspaceId: DEFAULT_WORKSPACE_ID,
            role: UserRole.STUDENT,
          },
        },
      },
    });

    return {
      message: 'User registered successfully',
      userId: user.id,
    };
  }

  async login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  this.loginAttempts.assertNotLocked(normalizedEmail);

  const user = await this.prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user || !user.passwordHash) {
    this.loginAttempts.recordFailure(normalizedEmail);
    this.logger.warn('Failed login: unknown account or missing password');
    throw new BadRequestException(
      'Invalid credentials',
    );
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    this.loginAttempts.recordFailure(normalizedEmail);
    this.logger.warn(`Failed login: invalid password userId=${user.id}`);
    throw new BadRequestException(
      'Invalid credentials',
    );
  }

  if (!user.isActive) {
    this.logger.warn(`Failed login: disabled account userId=${user.id}`);
    throw new BadRequestException(
      'Your account has been disabled. Contact the coordinator.',
    );
  }

  this.loginAttempts.recordSuccess(normalizedEmail);

  if (user.role === UserRole.SUPER_ADMIN) {
    return {
      accessToken: await this.signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        workspaceId: null,
        sessionVersion: user.sessionVersion,
      }),
    };
  }

  const contexts =
    await this.workspaceContext.listActiveContexts(user.id);

  if (contexts.length === 0) {
    throw new UnauthorizedException(
      'No active workspace membership found',
    );
  }

  if (contexts.length === 1) {
  const context = contexts[0];
  return {
    accessToken: await this.signAccessToken({
      userId: user.id,
      email: user.email,
      role: context.role as UserRole,
      workspaceId: context.workspaceId,
      sessionVersion: user.sessionVersion,
    }),
  };
  }

  return {
    requiresContextSelection: true,
    selectionToken: await this.jwtService.signAsync(
      {
        sub: user.id,
        type: AUTH_TOKEN_TYPES.CONTEXT_SELECTION,
      },
      {
        expiresIn: (this.config.get<string>('JWT_SELECTION_EXPIRES_IN') ??
          '10m') as StringValue,
      },
    ),
    contexts,
  };
}

async listContexts(userId: string) {
  return this.workspaceContext.listActiveContexts(userId);
}

async selectContext(
  selectionToken: string,
  workspaceId: string,
  role: UserRole,
) {
  const payload = await this.verifySelectionToken(selectionToken);
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user?.isActive) {
    throw new UnauthorizedException('Account is not active');
  }

  const membership =
    await this.prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId_role: {
          workspaceId,
          userId: user.id,
          role,
        },
      },
    });

  if (!membership?.isActive) {
    throw new BadRequestException('Invalid workspace context');
  }

  return {
    accessToken: await this.signAccessToken({
      userId: user.id,
      email: user.email,
      role,
      workspaceId,
      sessionVersion: user.sessionVersion,
    }),
  };
}

async switchContext(
  userId: string,
  workspaceId: string,
  role: UserRole,
) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.isActive) {
    throw new UnauthorizedException('Account is not active');
  }

  const membership =
    await this.prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId_role: {
          workspaceId,
          userId,
          role,
        },
      },
    });

  if (!membership?.isActive) {
    throw new BadRequestException('Invalid workspace context');
  }

  return {
    accessToken: await this.signAccessToken({
      userId: user.id,
      email: user.email,
      role,
      workspaceId,
      sessionVersion: user.sessionVersion,
    }),
  };
}

async forgotPassword(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await this.prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (user?.passwordHash) {
    const rawToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    await this.emailService.send(
      buildPasswordResetEmail({
        to: user.email,
        resetUrl: this.appUrls.passwordResetUrl(rawToken),
        expiresAt,
      }),
    );
  }

  return {
    message:
      'If an account exists for that email, password reset instructions have been sent.',
  };
}

async resetPassword(token: string, password: string) {
  const resetToken =
    await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

  if (!resetToken || resetToken.usedAt) {
    throw new BadRequestException('Invalid or expired reset link');
  }

  if (resetToken.expiresAt.getTime() < Date.now()) {
    throw new BadRequestException('Invalid or expired reset link');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await this.prisma.$transaction([
    this.prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    }),
    this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  this.logger.log(`Password reset completed; sessions revoked userId=${resetToken.userId}`);

  return { message: 'Password updated successfully' };
}

async changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  session: {
    email: string;
    role: UserRole;
    workspaceId: string | null;
  },
) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.passwordHash) {
    throw new BadRequestException('Password is not set for this account');
  }

  const matches = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );

  if (!matches) {
    throw new BadRequestException('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const updated = await this.prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      sessionVersion: { increment: 1 },
    },
    select: { sessionVersion: true },
  });

  this.logger.log(`Password changed; sessions revoked userId=${userId}`);

  return {
    message: 'Password changed successfully',
    accessToken: await this.signAccessToken({
      userId,
      email: session.email,
      role: session.role,
      workspaceId: session.workspaceId,
      sessionVersion: updated.sessionVersion,
    }),
  };
}

private async signAccessToken(input: {
  userId: string;
  email: string;
  role: UserRole;
  workspaceId: string | null;
  sessionVersion: number;
}) {
  return this.jwtService.signAsync({
    sub: input.userId,
    email: input.email,
    role: input.role,
    workspaceId: input.workspaceId,
    type: AUTH_TOKEN_TYPES.ACCESS,
    sv: input.sessionVersion,
  });
}

private async verifySelectionToken(token: string) {
  try {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      type?: string;
    }>(token);

    if (
      !payload?.sub ||
      payload.type !== AUTH_TOKEN_TYPES.CONTEXT_SELECTION
    ) {
      throw new UnauthorizedException('Invalid selection token');
    }

    return payload;
  } catch {
    throw new UnauthorizedException('Invalid or expired selection token');
  }
}

async getUserStats(workspaceId: string) {
  const memberships =
    await this.prisma.workspaceMembership.findMany({
      where: {
        workspaceId,
        isActive: true,
        role: {
          in: [
            UserRole.STUDENT,
            UserRole.SUPERVISOR,
            UserRole.COORDINATOR,
            UserRole.EVALUATOR,
          ],
        },
      },
      select: { role: true },
    });

  const totalStudents = memberships.filter(
    (row) => row.role === UserRole.STUDENT,
  ).length;
  const totalSupervisors = memberships.filter(
    (row) => row.role === UserRole.SUPERVISOR,
  ).length;
  const totalCoordinators = memberships.filter(
    (row) => row.role === UserRole.COORDINATOR,
  ).length;
  const totalEvaluators = memberships.filter(
    (row) => row.role === UserRole.EVALUATOR,
  ).length;

  return {
    totalStudents,
    totalSupervisors,
    totalCoordinators,
    totalEvaluators,
  };
}

async listSupervisors(workspaceId: string) {
  const memberships =
    await this.prisma.workspaceMembership.findMany({
      where: {
        workspaceId,
        role: UserRole.SUPERVISOR,
        isActive: true,
      },
      select: { userId: true },
    });

  const supervisorIds = memberships.map(
    (membership) => membership.userId,
  );

  if (supervisorIds.length === 0) {
    return [];
  }

  return this.prisma.user.findMany({
    where: {
      id: { in: supervisorIds },
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
    },
    orderBy: {
      fullName: 'asc',
    },
  });
}

async listSupervisorsForBrowsing(workspaceId: string) {
  const supervisors = await this.listSupervisors(workspaceId);

  if (supervisors.length === 0) {
    return [];
  }

  const supervisorIds = supervisors.map((s) => s.id);

  const [profiles, supervisedCounts] = await Promise.all([
    this.prisma.userProfile.findMany({
      where: { authUserId: { in: supervisorIds } },
    }),
    this.prisma.proposal.groupBy({
      by: ['assignedSupervisorId'],
      where: {
        assignedSupervisorId: { in: supervisorIds },
        status: { in: ['SUPERVISOR_ASSIGNED', 'APPROVED'] },
        team: { workspaceId },
      },
      _count: { _all: true },
    }),
  ]);

  const profileByUserId = new Map(
    profiles.map((profile) => [profile.authUserId, profile]),
  );

  const countBySupervisorId = new Map(
    supervisedCounts.map((row) => [
      row.assignedSupervisorId!,
      row._count._all,
    ]),
  );

  return supervisors.map((supervisor) => {
    const profile = profileByUserId.get(supervisor.id);
    const supervisedTeamCount =
      countBySupervisorId.get(supervisor.id) ?? 0;

    return {
      id: supervisor.id,
      fullName: supervisor.fullName,
      email: supervisor.email,
      profilePicture: profile?.profilePicture ?? null,
      department: profile?.department ?? null,
      designation: profile?.designation ?? null,
      researchAreas: profile?.researchAreas ?? [],
      biography: profile?.biography ?? null,
      officeHours: profile?.officeHours ?? null,
      supervisedTeamCount,
      // Capacity limit removed — supervisors remain available regardless of team count.
      isAvailable: true,
    };
  });
}

async listAllUsers(workspaceId: string) {
  const memberships =
    await this.prisma.workspaceMembership.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    });

  return memberships.map((membership) => ({
    membershipId: membership.id,
    id: membership.user.id,
    fullName: membership.user.fullName,
    email: membership.user.email,
    role: membership.role,
    isActive: membership.isActive,
    userIsActive: membership.user.isActive,
    createdAt: membership.createdAt,
  }));
}

async listActiveUserIds(workspaceId: string) {
  const memberships =
    await this.prisma.workspaceMembership.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      select: {
        userId: true,
        role: true,
      },
    });

  return memberships.map((membership) => ({
    id: membership.userId,
    role: membership.role,
  }));
}

async updateUserRole(
  targetUserId: string,
  role: 'STUDENT' | 'SUPERVISOR' | 'COORDINATOR' | 'EVALUATOR',
  coordinatorId: string,
  workspaceId: string,
) {
  if (targetUserId === coordinatorId) {
    throw new BadRequestException(
      'You cannot change your own role',
    );
  }

  const user = await this.prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    throw new BadRequestException('User not found');
  }

  const hasAnyMembership =
    await this.prisma.workspaceMembership.findFirst({
      where: { workspaceId, userId: targetUserId },
    });

  if (!hasAnyMembership) {
    throw new BadRequestException(
      'User is not a member of this workspace',
    );
  }

  await this.prisma.workspaceMembership.upsert({
    where: {
      workspaceId_userId_role: {
        workspaceId,
        userId: targetUserId,
        role,
      },
    },
    create: {
      workspaceId,
      userId: targetUserId,
      role,
      isActive: true,
    },
    update: {
      isActive: true,
    },
  });

  return this.prisma.user.update({
    where: { id: targetUserId },
    data: { role },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  }).then(async (updated) => {
    await this.notifyUser(
      targetUserId,
      'FOASIS Role Updated',
      `Your account role has been updated to ${role}.`,
      'ROLE_UPDATED',
      role,
    );

    const payload: UserRoleUpdatedPayload = {
      workspaceId,
      userId: updated.id,
      role: updated.role,
      fullName: updated.fullName,
      email: updated.email,
    };

    this.domainEventService.emitSafe({
      name: DomainEvents.USER_ROLE_UPDATED,
      timestamp: new Date().toISOString(),
      actorId: coordinatorId,
      scope: { type: 'workspace', id: workspaceId },
      entity: { type: 'USER', id: updated.id },
      payload,
    });

    return updated;
  });
}

async updateUserStatus(
  targetUserId: string,
  isActive: boolean,
  coordinatorId: string,
  workspaceId: string,
) {
  if (targetUserId === coordinatorId) {
    throw new BadRequestException(
      'You cannot disable your own account',
    );
  }

  const user = await this.prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    throw new BadRequestException('User not found');
  }

  const hasAnyMembership =
    await this.prisma.workspaceMembership.findFirst({
      where: { workspaceId, userId: targetUserId },
    });

  if (!hasAnyMembership) {
    throw new BadRequestException(
      'User is not a member of this workspace',
    );
  }

  await this.prisma.workspaceMembership.updateMany({
    where: {
      workspaceId,
      userId: targetUserId,
    },
    data: { isActive },
  });

  return this.prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  }).then(async (updated) => {
    await this.notifyUser(
      targetUserId,
      'FOASIS Account Status Updated',
      isActive
        ? 'Your FOASIS account has been re-enabled.'
        : 'Your FOASIS account has been disabled. Contact the coordinator.',
      'ACCOUNT_STATUS_UPDATED',
      updated.role,
    );

    const payload: UserStatusUpdatedPayload = {
      workspaceId,
      userId: updated.id,
      isActive: updated.isActive,
      role: updated.role,
      fullName: updated.fullName,
      email: updated.email,
    };

    this.domainEventService.emitSafe({
      name: DomainEvents.USER_STATUS_UPDATED,
      timestamp: new Date().toISOString(),
      actorId: coordinatorId,
      scope: { type: 'workspace', id: workspaceId },
      entity: { type: 'USER', id: updated.id },
      payload,
    });

    return updated;
  });
}

}
