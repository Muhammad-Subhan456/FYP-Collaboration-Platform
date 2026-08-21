"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { bootstrapAuthUser, getDashboardPath } from "@/lib/auth";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/types";

export function OnboardingGuard({
  children,
  role,
}: {
  children: React.ReactNode;
  role: UserRole;
}) {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    // Token exists but AuthProvider has not hydrated user yet — wait.
    // Redirecting to /auth/login here races invitation accept and middleware
    // then bounces authenticated users to the role dashboard, skipping onboarding.
    if (!user) {
      if (bootstrapAuthUser()) {
        return;
      }
      router.replace("/auth/login");
      return;
    }

    if (user.role !== role) {
      router.replace(getDashboardPath(user.role));
      return;
    }

    if (profile) {
      router.replace(getDashboardPath(user.role));
    }
  }, [user, profile, isLoading, role, router]);

  const waitingForHydration = !isLoading && !user && !!bootstrapAuthUser();

  if (isLoading || waitingForHydration || profile || !user || user.role !== role) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
