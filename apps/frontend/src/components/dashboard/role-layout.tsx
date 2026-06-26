"use client";

import { usePathname } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { getNavForRole } from "@/constants/navigation";
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
  const { profile } = useAuth();
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
          : "Oversee the FOASIS program";

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
