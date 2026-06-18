"use client";

import { useQuery } from "@tanstack/react-query";

import { profileService } from "@/services/profile.service";
import type { UserProfile } from "@/types/profile";

export function useProfilesLookup(authUserIds: string[]) {
  const uniqueIds = [...new Set(authUserIds.filter(Boolean))];

  return useQuery({
    queryKey: ["profiles", "batch", uniqueIds.sort().join(",")],
    queryFn: () => profileService.getBatchProfiles(uniqueIds),
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function getDisplayName(
  profiles: Record<string, UserProfile> | undefined,
  authUserId: string,
  fallback?: string,
) {
  return (
    profiles?.[authUserId]?.fullName ??
    fallback ??
    "Unknown User"
  );
}

export function getGreeting(name?: string) {
  const hour = new Date().getHours();
  const time =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = name?.split(" ")[0] ?? "there";
  return `${time}, ${firstName}`;
}
