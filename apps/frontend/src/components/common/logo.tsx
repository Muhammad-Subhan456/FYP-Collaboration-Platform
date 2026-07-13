"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { getDashboardPath } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  const { user, isAuthenticated } = useAuth();
  const href =
    isAuthenticated && user?.role
      ? getDashboardPath(user.role)
      : "/";

  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <GraduationCap className="h-5 w-5" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-none tracking-tight">
            FOASIS
          </span>
          <span className="text-[10px] text-muted-foreground">
            FYP Operations Platform
          </span>
        </div>
      )}
    </Link>
  );
}
