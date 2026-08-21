import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthService } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';

import {
  announcementRouteForRole,
  normalizeAudienceRoles,
} from './announcement-audience';

export type AnnouncementRecipient = {
  id: string;
  role: string;
  email: string;
  route: string;
};

@Injectable()
export class AnnouncementAudienceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async resolveRecipients(
    workspaceId: string,
    audienceRoles: string[],
    audienceUserIds: string[] = [],
  ): Promise<AnnouncementRecipient[]> {
    const memberships =
      await this.authService.listActiveUserIds(workspaceId);

    const byId = new Map(
      memberships.map((member) => [member.id, member] as const),
    );

    const roles = new Set(
      normalizeAudienceRoles(audienceRoles, {
        defaultToAllWhenEmpty: false,
      }).map((role) => role.toUpperCase()),
    );

    const fromRoles = memberships.filter((member) =>
      roles.has(member.role.toUpperCase()),
    );

    const uniqueUserIds = [
      ...new Set(audienceUserIds.filter(Boolean)),
    ];
    const fromUsers = uniqueUserIds
      .map((id) => byId.get(id))
      .filter((member): member is (typeof memberships)[number] => !!member);

    const merged = new Map<string, (typeof memberships)[number]>();
    for (const member of [...fromRoles, ...fromUsers]) {
      merged.set(member.id, member);
    }

    const filtered = [...merged.values()];
    if (filtered.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: filtered.map((member) => member.id) },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const emailById = Object.fromEntries(
      users.map((user) => [user.id, user.email]),
    );

    return filtered
      .filter((member) => emailById[member.id] !== undefined)
      .map((member) => ({
        id: member.id,
        role: member.role,
        email: emailById[member.id] ?? '',
        route: announcementRouteForRole(member.role),
      }));
  }

  async validateAudienceUserIds(
    workspaceId: string,
    audienceUserIds: string[],
  ): Promise<string[]> {
    const uniqueIds = [...new Set(audienceUserIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    const memberships = await this.prisma.workspaceMembership.findMany({
      where: {
        workspaceId,
        userId: { in: uniqueIds },
        isActive: true,
        role: {
          in: [UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.EVALUATOR],
        },
      },
      select: { userId: true },
    });

    const allowed = new Set(memberships.map((item) => item.userId));
    const valid = uniqueIds.filter((id) => allowed.has(id));

    if (valid.length === 0 && uniqueIds.length > 0) {
      throw new BadRequestException(
        'Selected users are not active members of this workspace',
      );
    }

    return valid;
  }

  audienceWhereForViewer(viewerRole: string, viewerUserId?: string) {
    if (viewerRole === UserRole.COORDINATOR) {
      return {};
    }

    const role = viewerRole.toUpperCase();
    const clauses: Array<Record<string, unknown>> = [
      { audienceRoles: { has: role } },
    ];

    if (viewerUserId) {
      clauses.push({ audienceUserIds: { has: viewerUserId } });
    }

    return { OR: clauses };
  }

  /** @deprecated Use audienceWhereForViewer */
  audienceWhereForRole(viewerRole: string) {
    return this.audienceWhereForViewer(viewerRole);
  }
}
