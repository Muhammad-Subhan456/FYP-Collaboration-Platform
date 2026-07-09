import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvitationStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AppUrlsService } from '../common/app-urls.service';
import {
  generateSecureToken,
  hashToken,
} from '../common/helpers/secure-token';
import { EmailService } from '../email/email.service';
import { buildInvitationEmail } from '../email/email.templates';
import { PrismaService } from '../prisma/prisma.service';

export type InviteUserInput = {
  email: string;
  fullName?: string;
  role: UserRole;
};

export type CsvImportRowResult = {
  row: number;
  email: string;
  role: string;
  status: 'invited' | 'skipped' | 'invalid';
  reason?: string;
};

export type CsvImportSummary = {
  total: number;
  invited: number;
  skipped: number;
  invalid: number;
  rows: CsvImportRowResult[];
};

const INVITABLE_ROLES: UserRole[] = [
  UserRole.STUDENT,
  UserRole.SUPERVISOR,
  UserRole.COORDINATOR,
  UserRole.EVALUATOR,
];

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly appUrls: AppUrlsService,
    private readonly config: ConfigService,
  ) {}

  private get invitationTtlHours(): number {
    return Number(
      this.config.get<string>('INVITATION_EXPIRES_HOURS') ?? 24,
    );
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private isInvitableRole(role: string): role is UserRole {
    return INVITABLE_ROLES.includes(role as UserRole);
  }

  private async expireStaleInvitations(
    workspaceId: string,
    email: string,
    role: UserRole,
  ) {
    await this.prisma.workspaceInvitation.updateMany({
      where: {
        workspaceId,
        email,
        role,
        status: InvitationStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: InvitationStatus.EXPIRED },
    });
  }

  async createInvitation(
    workspaceId: string,
    invitedById: string,
    input: InviteUserInput,
  ) {
    if (!workspaceId) {
      throw new BadRequestException('Workspace context is required');
    }

    const email = this.normalizeEmail(input.email);
    const role = input.role;

    if (!this.isInvitableRole(role)) {
      throw new BadRequestException('Invalid invitation role');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.isArchived) {
      throw new BadRequestException('Workspace is not available');
    }

    await this.expireStaleInvitations(workspaceId, email, role);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const membership =
        await this.prisma.workspaceMembership.findUnique({
          where: {
            workspaceId_userId_role: {
              workspaceId,
              userId: existingUser.id,
              role,
            },
          },
        });

      if (membership?.isActive) {
        throw new BadRequestException(
          'User already has this role in the workspace',
        );
      }
    }

    const pendingInvite =
      await this.prisma.workspaceInvitation.findFirst({
        where: {
          workspaceId,
          email,
          role,
          status: InvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
      });

    if (pendingInvite) {
      throw new BadRequestException(
        'A pending invitation already exists for this email and role',
      );
    }

    await this.prisma.workspaceInvitation.updateMany({
      where: {
        workspaceId,
        email,
        role,
        status: InvitationStatus.PENDING,
      },
      data: { status: InvitationStatus.REVOKED },
    });

    const rawToken = generateSecureToken();
    const expiresAt = new Date(
      Date.now() + this.invitationTtlHours * 60 * 60 * 1000,
    );

    const invitation =
      await this.prisma.workspaceInvitation.create({
        data: {
          workspaceId,
          email,
          fullName: input.fullName?.trim() || null,
          role,
          tokenHash: hashToken(rawToken),
          invitedById,
          expiresAt,
        },
        include: {
          workspace: { select: { name: true } },
        },
      });

    await this.emailService.send(
      buildInvitationEmail({
        to: email,
        workspaceName: invitation.workspace.name,
        role,
        invitationUrl: this.appUrls.invitationUrl(rawToken),
        expiresAt,
      }),
    );

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    };
  }

  async importFromCsv(
    workspaceId: string,
    invitedById: string,
    csvContent: string,
  ): Promise<CsvImportSummary> {
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const rows: CsvImportRowResult[] = [];
    let invited = 0;
    let skipped = 0;
    let invalid = 0;

    const startIndex =
      lines[0]?.toLowerCase().includes('email') ? 1 : 0;

    for (let index = startIndex; index < lines.length; index++) {
      const line = lines[index];
      const rowNumber = index + 1;
      const parts = line.split(',').map((part) => part.trim());

      if (parts.length < 2) {
        invalid++;
        rows.push({
          row: rowNumber,
          email: parts[0] ?? '',
          role: parts[1] ?? '',
          status: 'invalid',
          reason: 'Expected email,fullName,role or email,role',
        });
        continue;
      }

      let email: string;
      let fullName: string | undefined;
      let roleRaw: string;

      if (parts.length >= 3) {
        [email, fullName, roleRaw] = parts;
      } else {
        [email, roleRaw] = parts;
      }

      const role = roleRaw.toUpperCase();

      if (!email.includes('@')) {
        invalid++;
        rows.push({
          row: rowNumber,
          email,
          role,
          status: 'invalid',
          reason: 'Invalid email address',
        });
        continue;
      }

      if (!this.isInvitableRole(role)) {
        invalid++;
        rows.push({
          row: rowNumber,
          email,
          role,
          status: 'invalid',
          reason: 'Unsupported role',
        });
        continue;
      }

      try {
        await this.createInvitation(workspaceId, invitedById, {
          email,
          fullName,
          role,
        });
        invited++;
        rows.push({
          row: rowNumber,
          email,
          role,
          status: 'invited',
        });
      } catch (error: any) {
        skipped++;
        rows.push({
          row: rowNumber,
          email,
          role,
          status: 'skipped',
          reason: error?.message ?? 'Skipped',
        });
      }
    }

    return {
      total: rows.length,
      invited,
      skipped,
      invalid,
      rows,
    };
  }

  async listWorkspaceInvitations(workspaceId: string) {
    await this.prisma.workspaceInvitation.updateMany({
      where: {
        workspaceId,
        status: InvitationStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: InvitationStatus.EXPIRED },
    });

    return this.prisma.workspaceInvitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
      },
    });
  }

  async resendInvitation(
    workspaceId: string,
    invitationId: string,
    invitedById: string,
  ) {
    const invitation =
      await this.prisma.workspaceInvitation.findFirst({
        where: { id: invitationId, workspaceId },
        include: { workspace: { select: { name: true } } },
      });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException(
        'Invitation has already been accepted',
      );
    }

    await this.prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.REVOKED },
    });

    return this.createInvitation(workspaceId, invitedById, {
      email: invitation.email,
      fullName: invitation.fullName ?? undefined,
      role: invitation.role,
    });
  }

  async verifyInvitationToken(token: string) {
    const invitation = await this.findValidInvitation(token);

    return {
      email: invitation.email,
      fullName: invitation.fullName,
      role: invitation.role,
      workspaceName: invitation.workspace.name,
      expiresAt: invitation.expiresAt,
    };
  }

  async acceptInvitation(
    token: string,
    fullName: string,
    password: string,
  ) {
    const invitation = await this.findValidInvitation(token);
    const email = invitation.email;
    const passwordHash = await bcrypt.hash(password, 10);
    const resolvedName =
      fullName.trim() || invitation.fullName || email;

    const user = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email },
      });

      const savedUser = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              fullName: resolvedName,
              ...(existing.passwordHash
                ? {}
                : { passwordHash }),
              isActive: true,
              role: invitation.role,
            },
          })
        : await tx.user.create({
            data: {
              email,
              fullName: resolvedName,
              passwordHash,
              role: invitation.role,
              isActive: true,
            },
          });

      if (!existing?.passwordHash && password) {
        await tx.user.update({
          where: { id: savedUser.id },
          data: { passwordHash },
        });
      }

      await tx.workspaceMembership.upsert({
        where: {
          workspaceId_userId_role: {
            workspaceId: invitation.workspaceId,
            userId: savedUser.id,
            role: invitation.role,
          },
        },
        create: {
          workspaceId: invitation.workspaceId,
          userId: savedUser.id,
          role: invitation.role,
          isActive: true,
        },
        update: {
          isActive: true,
        },
      });

      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      await tx.workspaceInvitation.updateMany({
        where: {
          workspaceId: invitation.workspaceId,
          email,
          role: invitation.role,
          status: InvitationStatus.PENDING,
          NOT: { id: invitation.id },
        },
        data: { status: InvitationStatus.REVOKED },
      });

      return savedUser;
    });

    return {
      userId: user.id,
      email: user.email,
      workspaceId: invitation.workspaceId,
      role: invitation.role,
    };
  }

  private async findValidInvitation(token: string) {
    const invitation =
      await this.prisma.workspaceInvitation.findUnique({
        where: { tokenHash: hashToken(token) },
        include: {
          workspace: { select: { name: true, isArchived: true } },
        },
      });

    if (!invitation) {
      throw new BadRequestException('Invalid invitation link');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is no longer valid');
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      await this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    if (invitation.workspace.isArchived) {
      throw new BadRequestException('Workspace is not available');
    }

    return invitation;
  }
}
