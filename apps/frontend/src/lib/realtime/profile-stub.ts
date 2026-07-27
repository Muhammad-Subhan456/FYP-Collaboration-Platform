import type { UserProfile } from "@/types/profile";

/**
 * Upsert a minimal profile entry so comment threads can resolve author
 * names immediately from realtime / optimistic payloads.
 */
export function upsertAuthorProfile(
  profiles: Record<string, UserProfile>,
  authUserId: string,
  authorName?: string | null,
): Record<string, UserProfile> {
  const existing = profiles[authUserId];
  if (existing?.fullName) {
    return profiles;
  }

  const fullName = authorName?.trim();
  if (!fullName) {
    return profiles;
  }

  return {
    ...profiles,
    [authUserId]: {
      id: existing?.id ?? authUserId,
      authUserId,
      profileType: existing?.profileType ?? "STUDENT",
      fullName,
      skills: existing?.skills ?? [],
      interests: existing?.interests ?? [],
      researchAreas: existing?.researchAreas ?? [],
      publications: existing?.publications ?? [],
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: existing?.updatedAt ?? new Date().toISOString(),
      ...existing,
      fullName,
    },
  };
}
