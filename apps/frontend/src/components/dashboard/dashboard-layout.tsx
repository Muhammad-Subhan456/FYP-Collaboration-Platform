"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getNavForRole } from "@/constants/navigation";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { closeMobileMenu, selectMobileMenuOpen } from "@/store/slices/ui-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { UserRole } from "@/types";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  roleLabel: string;
  title: string;
  description?: string;
}

export function DashboardLayout({
  children,
  role,
  roleLabel,
  title,
  description,
}: DashboardLayoutProps) {
  const dispatch = useAppDispatch();
  const mobileOpen = useAppSelector(selectMobileMenuOpen);
  const { isLoading, user } = useAuth();
  const navItems = getNavForRole(role);
  const pathname = usePathname();
  const { data: unread } = useUnreadNotifications(!!user);
  const unreadCount = unread?.count ?? 0;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={navItems} roleLabel={roleLabel} unreadCount={unreadCount} />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => dispatch(closeMobileMenu())}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Logo />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => dispatch(closeMobileMenu())}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => dispatch(closeMobileMenu())}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <span>{item.title}</span>
                    {item.icon === "Bell" && unreadCount > 0 && (
                      <Badge className="h-5 min-w-5 justify-center px-1 text-[10px]">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          title={title}
          description={description}
          role={role}
          unreadCount={unreadCount}
        />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
