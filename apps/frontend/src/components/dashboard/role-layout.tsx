"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { getNavForRole } from "@/constants/navigation";
import { ROLE_ROUTES } from "@/constants/routes";
import { getGreeting } from "@/hooks/use-profiles";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/types";

interface RoleLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  roleLabel: string;
}

export function RoleLayout({ children, role, roleLabel }: RoleLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();
  const navItems = getNavForRole(role);
  const current = navItems.find((item) => item.href === pathname);
  const title = current?.title ?? "Dashboard";
  const greeting = getGreeting(profile?.fullName);
  const description =
    pathname.endsWith("/dashboard")
      ? greeting
      : role === "STUDENT"
        ? "Manage your FOASIS journey"
        : role === "SUPERVISOR"
          ? "Supervise teams and review work on FOASIS"
          : role === "COORDINATOR"
            ? pathname.endsWith("/profile")
              ? "Manage your coordinator profile"
              : "Oversee the FOASIS program"
            : role === "EVALUATOR"
              ? pathname.endsWith("/profile")
                ? "Manage your evaluator profile"
                : "Complete assigned evaluations on FOASIS"
              : "Manage FOASIS workspaces";

  useEffect(() => {
    if (isLoading || !user?.role) return;
    if (user.role !== role) {
      router.replace(`${ROLE_ROUTES[user.role]}/dashboard`);
    }
  }, [isLoading, user?.role, role, router]);

  if (!isLoading && user?.role && user.role !== role) {
    return null;
  }

  return (
    <DashboardLayout
      role={role}
      roleLabel={roleLabel}
      title={title}
      description={description}
    >
      {children}
    </DashboardLayout>
  );
}
