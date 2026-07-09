import { Injectable } from '@nestjs/common';
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
  ): Promise<AnnouncementRecipient[]> {
    const roles = new Set(
      normalizeAudienceRoles(audienceRoles).map((role) =>
        role.toUpperCase(),
      ),
    );

    const memberships =
      await this.authService.listActiveUserIds(workspaceId);

    const filtered = memberships.filter((member) =>
      roles.has(member.role.toUpperCase()),
    );

    if (filtered.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: filtered.map((member) => member.id) },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const emailById = Object.fromEntries(
      users.map((user) => [user.id, user.email]),
    );

    return filtered.map((member) => ({
      id: member.id,
      role: member.role,
      email: emailById[member.id] ?? '',
      route: announcementRouteForRole(member.role),
    }));
  }

  audienceWhereForRole(viewerRole: string) {
    if (viewerRole === UserRole.COORDINATOR) {
      return {};
    }

    const role = viewerRole.toUpperCase();
    return {
      audienceRoles: { has: role },
    };
  }
}
