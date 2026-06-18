"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getOnboardingPath } from "@/constants/navigation";
import { useAuth } from "@/providers/auth-provider";

export default function OnboardingRedirectPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    router.replace(getOnboardingPath(user.role));
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
