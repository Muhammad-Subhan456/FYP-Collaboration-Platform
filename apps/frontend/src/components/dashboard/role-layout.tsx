"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { getNavForRole } from "@/constants/navigation";
import { getPageDescription, getPageGuidance } from "@/constants/page-copy";
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
  const current = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const title =
    current?.title ??
    (pathname.includes("/evaluations/") ? "Evaluation" : "Dashboard");
  const greeting = getGreeting(profile?.fullName);
  const pageDescription = getPageDescription(pathname);
  const description = pathname.endsWith("/dashboard")
    ? greeting
    : pageDescription;
  const guidance = getPageGuidance(pathname);

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
      guidance={guidance}
    >
      {children}
    </DashboardLayout>
  );
}
