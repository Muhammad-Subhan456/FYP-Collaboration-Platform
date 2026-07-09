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
): AnnouncementAudienceRole[] {
  if (!roles?.length) {
    return [...ALL_ANNOUNCEMENT_AUDIENCE_ROLES];
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

  return normalized.length > 0
    ? normalized
    : [...ALL_ANNOUNCEMENT_AUDIENCE_ROLES];
}

export function isAnnouncementVisibleToRole(
  audienceRoles: string[],
  viewerRole: string,
): boolean {
  if (viewerRole === UserRole.COORDINATOR) {
    return true;
  }

  const normalizedAudience = normalizeAudienceRoles(audienceRoles);
  return normalizedAudience.includes(
    viewerRole as AnnouncementAudienceRole,
  );
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
