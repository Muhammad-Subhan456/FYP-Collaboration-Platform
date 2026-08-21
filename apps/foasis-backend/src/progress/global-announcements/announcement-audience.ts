import { UserRole } from '@prisma/client';

/** Roles that can receive workspace-wide coordinator announcements. */
export const ANNOUNCEMENT_RECIPIENT_ROLES: UserRole[] = [
  UserRole.STUDENT,
  UserRole.SUPERVISOR,
  UserRole.EVALUATOR,
];

export const ALL_ANNOUNCEMENT_AUDIENCE_ROLES = [
  ...ANNOUNCEMENT_RECIPIENT_ROLES,
] as const;

export type AnnouncementAudienceRole =
  (typeof ALL_ANNOUNCEMENT_AUDIENCE_ROLES)[number];

export function normalizeAudienceRoles(
  roles?: string[] | null,
  options?: { defaultToAllWhenEmpty?: boolean },
): AnnouncementAudienceRole[] {
  const defaultToAllWhenEmpty = options?.defaultToAllWhenEmpty ?? true;

  if (!roles?.length) {
    return defaultToAllWhenEmpty ? [...ALL_ANNOUNCEMENT_AUDIENCE_ROLES] : [];
  }

  const allowed = new Set<string>(ALL_ANNOUNCEMENT_AUDIENCE_ROLES);
  const normalized = [
    ...new Set(
      roles
        .map((role) => role.toUpperCase())
        .filter((role): role is AnnouncementAudienceRole =>
          allowed.has(role),
        ),
    ),
  ];

  if (normalized.length > 0) {
    return normalized;
  }

  return defaultToAllWhenEmpty ? [...ALL_ANNOUNCEMENT_AUDIENCE_ROLES] : [];
}

export function isAnnouncementVisibleToAudience(input: {
  audienceRoles: string[];
  audienceUserIds?: string[] | null;
  viewerRole: string;
  viewerUserId?: string | null;
}): boolean {
  if (input.viewerRole === UserRole.COORDINATOR) {
    return true;
  }

  if (
    input.viewerUserId &&
    (input.audienceUserIds ?? []).includes(input.viewerUserId)
  ) {
    return true;
  }

  if (!input.audienceRoles.length) {
    return false;
  }

  const normalizedAudience = normalizeAudienceRoles(input.audienceRoles, {
    defaultToAllWhenEmpty: false,
  });
  return normalizedAudience.includes(
    input.viewerRole as AnnouncementAudienceRole,
  );
}

/** @deprecated Prefer isAnnouncementVisibleToAudience for user-targeted announcements. */
export function isAnnouncementVisibleToRole(
  audienceRoles: string[],
  viewerRole: string,
): boolean {
  return isAnnouncementVisibleToAudience({
    audienceRoles,
    audienceUserIds: [],
    viewerRole,
  });
}

export function announcementRouteForRole(role: string): string {
  switch (role) {
    case UserRole.COORDINATOR:
      return '/coordinator/announcements';
    case UserRole.SUPERVISOR:
      return '/supervisor/announcements';
    case UserRole.EVALUATOR:
      return '/evaluator/dashboard';
    default:
      return '/student/announcements';
  }
}
