"use client";

import { LogOut, Menu, User } from "lucide-react";

import { PageInfoButton } from "@/components/common/page-info-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { WorkspaceSwitcher } from "@/components/auth/workspace-switcher";
import type { PageGuidance } from "@/constants/page-copy";
import { useAuth } from "@/providers/auth-provider";
import { openMobileMenu } from "@/store/slices/ui-slice";
import { useAppDispatch } from "@/store/hooks";
import type { UserRole } from "@/types";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  guidance?: PageGuidance;
  role: UserRole;
  unreadCount?: number;
}

export function DashboardHeader({
  title,
  description,
  guidance,
  role,
  unreadCount,
}: DashboardHeaderProps) {
  const dispatch = useAppDispatch();
  const { user, profile, logout } = useAuth();

  const initials =
    profile?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={() => dispatch(openMobileMenu())}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
              {title}
            </h1>
            {guidance ? (
              <PageInfoButton title={title} guidance={guidance} />
            ) : null}
          </div>
          {description ? (
            <p className="hidden truncate text-sm text-muted-foreground sm:block">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <WorkspaceSwitcher />
        <ThemeToggle />
        <NotificationBell role={role} unreadCount={unreadCount} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[120px] truncate text-sm font-medium md:inline">
                {profile?.fullName ?? user?.email}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{profile?.fullName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={`/${role.toLowerCase()}/profile`}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
