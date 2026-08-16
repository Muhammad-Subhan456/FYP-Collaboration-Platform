import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Department,
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
import {
  buildInvitationEmail,
  buildRoleAssignedEmail,
} from '../email/email.templates';
import { PrismaService } from '../prisma/prisma.service';

/** Safe user-facing reason for CSV row skips — never raw Prisma/internal text. */
function getSafeSkipReason(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response === 'object' && response !== null) {
      const message = (response as { message?: string | string[] }).message;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message)) {
        return message.join(', ');
      }
    }
    return error.message;
  }
  return 'Skipped';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_DEPARTMENTS = new Set<string>(Object.values(Department));

export type StudentAcademicFields = {
  registrationNumber: string;
  batch: string;
  department: Department;
  degreeProgram: string;
};

export type InviteUserInput = {
  email: string;
  fullName?: string;
  role: UserRole;
  registrationNumber?: string;
  batch?: string;
  department?: Department | string;
  degreeProgram?: string;
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

type CsvFormat = 'student' | 'faculty';

type ParsedCsvRow = {
  email: string;
  fullName?: string;
  role: string;
  registrationNumber?: string;
  batch?: string;
  department?: string;
  degreeProgram?: string;
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function isRollHeader(normalized: string): boolean {
  return (
    normalized === 'rollno' ||
    normalized === 'registrationnumber' ||
    normalized === 'registrationno' ||
    normalized === 'regno'
  );
}

function isDegreeHeader(normalized: string): boolean {
  return (
    normalized === 'degree' ||
    normalized === 'degreeprogram' ||
    normalized === 'degreeprogramme'
  );
}

function detectCsvFormat(headerCells: string[]): CsvFormat {
  const normalized = headerCells.map(normalizeHeader);
  if (normalized.some(isRollHeader)) {
    return 'student';
  }
  return 'faculty';
}

function buildHeaderIndex(headerCells: string[]): Map<string, number> {
  const index = new Map<string, number>();
  headerCells.forEach((cell, i) => {
    const key = normalizeHeader(cell);
    if (key) {
      index.set(key, i);
    }
  });
  return index;
}

function cellAt(
  parts: string[],
  headerIndex: Map<string, number>,
  keys: string[],
): string {
  for (const key of keys) {
    const idx = headerIndex.get(key);
    if (idx !== undefined && parts[idx] !== undefined) {
      return parts[idx].trim();
    }
  }
  return '';
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

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

  private normalizeDepartment(
    value: string | Department | undefined,
  ): Department | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const upper = String(value).trim().toUpperCase();
    if (!VALID_DEPARTMENTS.has(upper)) {
      return undefined;
    }
    return upper as Department;
  }

  private extractAcademicFields(
    input: InviteUserInput,
  ): StudentAcademicFields | null {
    const registrationNumber = input.registrationNumber?.trim();
    const batch = input.batch?.trim();
    const department = this.normalizeDepartment(input.department);
    const degreeProgram = input.degreeProgram?.trim();

    if (!registrationNumber && !batch && !department && !degreeProgram) {
      return null;
    }

    if (!registrationNumber || !batch || !department || !degreeProgram) {
      throw new BadRequestException(
        'Student invitations with academic fields require roll number, batch, department, and degree',
      );
    }

    return {
      registrationNumber,
      batch,
      department,
      degreeProgram,
    };
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

  private async assertStudentAcademicUnique(params: {
    workspaceId: string;
    email: string;
    registrationNumber: string;
  }) {
    const { workspaceId, email, registrationNumber } = params;

    const pendingRoll = await this.prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        registrationNumber,
        role: UserRole.STUDENT,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
        NOT: { email },
      },
      select: { id: true },
    });

    if (pendingRoll) {
      throw new BadRequestException(
        'A pending invitation already uses this registration number',
      );
    }

    const studentMembers = await this.prisma.workspaceMembership.findMany({
      where: {
        workspaceId,
        role: UserRole.STUDENT,
        isActive: true,
      },
      select: { userId: true },
    });

    if (studentMembers.length === 0) {
      return;
    }

    const existingRoll = await this.prisma.userProfile.findFirst({
      where: {
        profileType: 'STUDENT',
        registrationNumber,
        authUserId: { in: studentMembers.map((m) => m.userId) },
      },
      select: { authUserId: true },
    });

    if (!existingRoll) {
      return;
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: existingRoll.authUserId },
      select: { email: true },
    });

    if (
      owner?.email &&
      this.normalizeEmail(owner.email) !== this.normalizeEmail(email)
    ) {
      throw new BadRequestException(
        'Registration number already belongs to a student in this workspace',
      );
    }
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

    if (!EMAIL_RE.test(email)) {
      throw new BadRequestException('Invalid email address');
    }

    const academic =
      role === UserRole.STUDENT ? this.extractAcademicFields(input) : null;

    if (academic) {
      await this.assertStudentAcademicUnique({
        workspaceId,
        email,
        registrationNumber: academic.registrationNumber,
      });
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

    // Existing FOASIS users: assign membership immediately and send an
    // informational email only (no invite / password-setup links).
    if (existingUser) {
      return this.assignRoleToExistingUser({
        workspaceId,
        workspaceName: workspace.name,
        userId: existingUser.id,
        email,
        role,
        invitedById,
        academic,
      });
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
          registrationNumber: academic?.registrationNumber ?? null,
          batch: academic?.batch ?? null,
          department: academic?.department ?? null,
          degreeProgram: academic?.degreeProgram ?? null,
          tokenHash: hashToken(rawToken),
          invitedById,
          expiresAt,
        },
        include: {
          workspace: { select: { name: true } },
        },
      });

    let emailSent = true;
    try {
      await this.emailService.send(
        buildInvitationEmail({
          to: email,
          workspaceName: invitation.workspace.name,
          role,
          invitationUrl: this.appUrls.invitationUrl(rawToken),
          expiresAt,
        }),
      );
    } catch (error) {
      // Don't fail onboarding if the mail provider hiccups — the invitation
      // record exists and can be resent from the workspace admin UI.
      emailSent = false;
      this.logger.error(
        `Failed to send invitation email to ${email}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      emailSent,
      assignedExistingUser: false,
    };
  }

  /**
   * Directly grant workspace membership to a registered user and notify them.
   * For STUDENT invites with academic fields, records an ACCEPTED invitation
   * for onboarding prefill and applies institutionManaged profile rules.
   */
  private async assignRoleToExistingUser(params: {
    workspaceId: string;
    workspaceName: string;
    userId: string;
    email: string;
    role: UserRole;
    invitedById: string;
    academic: StudentAcademicFields | null;
  }) {
    const {
      workspaceId,
      workspaceName,
      userId,
      email,
      role,
      invitedById,
      academic,
    } = params;

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

    if (membership?.isActive) {
      throw new BadRequestException(
        'User already has this role in the workspace',
      );
    }

    const assigned = await this.prisma.$transaction(async (tx) => {
      const membershipRow = await tx.workspaceMembership.upsert({
        where: {
          workspaceId_userId_role: {
            workspaceId,
            userId,
            role,
          },
        },
        create: {
          workspaceId,
          userId,
          role,
          isActive: true,
        },
        update: {
          isActive: true,
        },
      });

      if (role === UserRole.SUPERVISOR) {
        await tx.workspaceMembership.upsert({
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

      await tx.workspaceInvitation.updateMany({
        where: {
          workspaceId,
          email,
          role,
          status: InvitationStatus.PENDING,
        },
        data: { status: InvitationStatus.REVOKED },
      });

      if (role === UserRole.STUDENT && academic) {
        await tx.workspaceInvitation.create({
          data: {
            workspaceId,
            email,
            role: UserRole.STUDENT,
            registrationNumber: academic.registrationNumber,
            batch: academic.batch,
            department: academic.department,
            degreeProgram: academic.degreeProgram,
            tokenHash: hashToken(generateSecureToken()),
            invitedById,
            status: InvitationStatus.ACCEPTED,
            acceptedAt: new Date(),
            expiresAt: new Date(),
          },
        });

        const profile = await tx.userProfile.findUnique({
          where: { authUserId: userId },
        });

        if (profile?.institutionManaged) {
          await tx.userProfile.update({
            where: { authUserId: userId },
            data: {
              registrationNumber: academic.registrationNumber,
              batch: academic.batch,
              department: academic.department,
              degreeProgram: academic.degreeProgram,
              institutionManaged: true,
            },
          });
        }
        // No profile / non-managed profile: do not create or overwrite;
        // institution-prefill covers onboarding for profile-less students.
      }

      return membershipRow;
    });

    let emailSent = true;
    try {
      await this.emailService.send(
        buildRoleAssignedEmail({
          to: email,
          workspaceName,
          role,
        }),
      );
    } catch (error) {
      emailSent = false;
      this.logger.error(
        `Failed to send role-assignment email to ${email}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      id: assigned.id,
      email,
      role,
      status: InvitationStatus.ACCEPTED,
      expiresAt: null as Date | null,
      emailSent,
      assignedExistingUser: true,
    };
  }

  private parseCsvLine(line: string): string[] {
    return line.split(',').map((part) => part.trim());
  }

  private parseStudentCsvRow(
    parts: string[],
    headerIndex: Map<string, number>,
  ): ParsedCsvRow {
    const email = cellAt(parts, headerIndex, ['email']);
    const registrationNumber = cellAt(parts, headerIndex, [
      'rollno',
      'registrationnumber',
      'registrationno',
      'regno',
    ]);
    const batch = cellAt(parts, headerIndex, ['batch']);
    const department = cellAt(parts, headerIndex, ['department']);
    const degreeProgram = cellAt(parts, headerIndex, [
      'degree',
      'degreeprogram',
      'degreeprogramme',
    ]);
    const role = cellAt(parts, headerIndex, ['role']);

    return {
      email,
      registrationNumber,
      batch,
      department,
      degreeProgram,
      role,
    };
  }

  private parseFacultyCsvRow(parts: string[]): ParsedCsvRow {
    if (parts.length >= 3) {
      const [email, fullName, roleRaw] = parts;
      return { email, fullName, role: roleRaw };
    }
    const [email, roleRaw] = parts;
    return { email, role: roleRaw ?? '' };
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

    if (lines.length === 0) {
      return { total: 0, invited: 0, skipped: 0, invalid: 0, rows: [] };
    }

    const firstCells = this.parseCsvLine(lines[0]);
    const hasHeader = firstCells.some(
      (cell) => normalizeHeader(cell) === 'email',
    );
    const format: CsvFormat = hasHeader
      ? detectCsvFormat(firstCells)
      : 'faculty';
    const headerIndex = hasHeader
      ? buildHeaderIndex(firstCells)
      : new Map<string, number>();
    const startIndex = hasHeader ? 1 : 0;

    const seenEmails = new Set<string>();
    const seenRolls = new Set<string>();

    for (let index = startIndex; index < lines.length; index++) {
      const line = lines[index];
      const rowNumber = index + 1;
      const parts = this.parseCsvLine(line);

      const parsed: ParsedCsvRow =
        format === 'student'
          ? this.parseStudentCsvRow(parts, headerIndex)
          : this.parseFacultyCsvRow(parts);

      const emailRaw = parsed.email ?? '';
      const roleRaw = (parsed.role ?? '').toUpperCase();

      if (format === 'faculty' && parts.length < 2) {
        invalid++;
        rows.push({
          row: rowNumber,
          email: emailRaw,
          role: roleRaw,
          status: 'invalid',
          reason: 'Expected email,fullName,role or email,role',
        });
        continue;
      }

      if (!EMAIL_RE.test(emailRaw.trim())) {
        invalid++;
        rows.push({
          row: rowNumber,
          email: emailRaw,
          role: roleRaw,
          status: 'invalid',
          reason: 'Invalid email address',
        });
        continue;
      }

      const email = this.normalizeEmail(emailRaw);

      if (seenEmails.has(email)) {
        invalid++;
        rows.push({
          row: rowNumber,
          email,
          role: roleRaw,
          status: 'invalid',
          reason: 'Duplicate email in CSV',
        });
        continue;
      }

      if (!this.isInvitableRole(roleRaw)) {
        invalid++;
        rows.push({
          row: rowNumber,
          email,
          role: roleRaw,
          status: 'invalid',
          reason: 'Unsupported role',
        });
        continue;
      }

      if (format === 'student') {
        if (roleRaw !== UserRole.STUDENT) {
          invalid++;
          rows.push({
            row: rowNumber,
            email,
            role: roleRaw,
            status: 'invalid',
            reason: 'Student CSV rows must use role STUDENT',
          });
          continue;
        }

        const roll = parsed.registrationNumber?.trim() ?? '';
        const batch = parsed.batch?.trim() ?? '';
        const departmentRaw = parsed.department?.trim() ?? '';
        const degree = parsed.degreeProgram?.trim() ?? '';
        const department = this.normalizeDepartment(departmentRaw);

        if (!roll || !batch || !departmentRaw || !degree) {
          invalid++;
          rows.push({
            row: rowNumber,
            email,
            role: roleRaw,
            status: 'invalid',
            reason:
              'Student rows require roll no, batch, department, and degree',
          });
          continue;
        }

        if (!department) {
          invalid++;
          rows.push({
            row: rowNumber,
            email,
            role: roleRaw,
            status: 'invalid',
            reason: 'Invalid department (use CS, SE, IT, AI, or DS)',
          });
          continue;
        }

        const rollKey = roll.toLowerCase();
        if (seenRolls.has(rollKey)) {
          invalid++;
          rows.push({
            row: rowNumber,
            email,
            role: roleRaw,
            status: 'invalid',
            reason: 'Duplicate registration number in CSV',
          });
          continue;
        }

        seenEmails.add(email);
        seenRolls.add(rollKey);

        try {
          await this.createInvitation(workspaceId, invitedById, {
            email,
            role: UserRole.STUDENT,
            registrationNumber: roll,
            batch,
            department,
            degreeProgram: degree,
          });
          invited++;
          rows.push({
            row: rowNumber,
            email,
            role: roleRaw,
            status: 'invited',
          });
        } catch (error: unknown) {
          skipped++;
          rows.push({
            row: rowNumber,
            email,
            role: roleRaw,
            status: 'skipped',
            reason: getSafeSkipReason(error),
          });
        }
        continue;
      }

      // Faculty / legacy format
      seenEmails.add(email);

      try {
        await this.createInvitation(workspaceId, invitedById, {
          email,
          fullName: parsed.fullName,
          role: roleRaw,
        });
        invited++;
        rows.push({
          row: rowNumber,
          email,
          role: roleRaw,
          status: 'invited',
        });
      } catch (error: unknown) {
        skipped++;
        rows.push({
          row: rowNumber,
          email,
          role: roleRaw,
          status: 'skipped',
          reason: getSafeSkipReason(error),
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
        registrationNumber: true,
        batch: true,
        department: true,
        degreeProgram: true,
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
      registrationNumber: invitation.registrationNumber ?? undefined,
      batch: invitation.batch ?? undefined,
      department: invitation.department ?? undefined,
      degreeProgram: invitation.degreeProgram ?? undefined,
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
      registrationNumber: invitation.registrationNumber,
      batch: invitation.batch,
      department: invitation.department,
      degreeProgram: invitation.degreeProgram,
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

    // Do not create a UserProfile here — institution fields stay on the
    // ACCEPTED invitation and are applied during student onboarding via
    // GET /profiles/me/institution-prefill.
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

      if (invitation.role === UserRole.SUPERVISOR) {
        await tx.workspaceMembership.upsert({
          where: {
            workspaceId_userId_role: {
              workspaceId: invitation.workspaceId,
              userId: savedUser.id,
              role: UserRole.EVALUATOR,
            },
          },
          create: {
            workspaceId: invitation.workspaceId,
            userId: savedUser.id,
            role: UserRole.EVALUATOR,
            isActive: true,
          },
          update: {
            isActive: true,
          },
        });
      }

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
      registrationNumber: invitation.registrationNumber,
      batch: invitation.batch,
      department: invitation.department,
      degreeProgram: invitation.degreeProgram,
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
