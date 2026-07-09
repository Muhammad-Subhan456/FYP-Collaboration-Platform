"use client";

import { useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { authService } from "@/services/auth.service";
import type { AuthContextOption } from "@/types";

export function WorkspaceSwitcher() {
  const { user, switchContext } = useAuth();
  const [switching, setSwitching] = useState(false);

  const contextsQuery = useQuery({
    queryKey: ["auth", "contexts", user?.userId],
    queryFn: () => authService.listContexts(),
    enabled: !!user && user.role !== "SUPER_ADMIN",
  });

  const contexts = contextsQuery.data ?? [];
  const current = contexts.find(
    (context) =>
      context.workspaceId === user?.workspaceId &&
      context.role === user?.role,
  );

  if (!user || user.role === "SUPER_ADMIN" || contexts.length <= 1) {
    return null;
  }

  const handleSwitch = async (context: AuthContextOption) => {
    if (
      context.workspaceId === user.workspaceId &&
      context.role === user.role
    ) {
      return;
    }

    setSwitching(true);
    try {
      await switchContext(context.workspaceId, context.role);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden max-w-[260px] gap-2 lg:flex"
          disabled={switching}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate text-left">
            {current
              ? `${current.workspaceName} · ${current.role}`
              : "Select workspace"}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <p className="px-2 py-1.5 text-sm font-semibold">
          Switch workspace / role
        </p>
        <DropdownMenuSeparator />
        {contexts.map((context) => {
          const isActive =
            context.workspaceId === user.workspaceId &&
            context.role === user.role;

          return (
            <DropdownMenuItem
              key={`${context.workspaceId}-${context.role}`}
              onClick={() => handleSwitch(context)}
              className="flex items-center justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {context.workspaceName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {context.role}
                </p>
              </div>
              {isActive ? <Check className="h-4 w-4" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
