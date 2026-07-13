"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Bell,
  Calendar,
  CheckSquare,
  FileText,
  Flag,
  Inbox,
  LayoutDashboard,
  Mail,
  Megaphone,
  Package,
  Upload,
  User,
  Users,
  Video,
  BarChart3,
  Building2,
  UserCog,
  Server,
  Layers,
  FileStack,
  FileCheck,
  type LucideIcon,
} from "lucide-react";

import { Logo } from "@/components/common/logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NavItemConfig } from "@/constants/navigation";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Upload,
  Calendar,
  Award,
  Bell,
  User,
  Inbox,
  Mail,
  CheckSquare,
  Megaphone,
  Video,
  Flag,
  BarChart3,
  Building2,
  UserCog,
  Server,
  Layers,
  FileStack,
  FileCheck,
};

interface SidebarProps {
  items: NavItemConfig[];
  roleLabel: string;
  unreadCount?: number;
}

export function Sidebar({ items, roleLabel, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/50 lg:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Logo />
      </div>
      <div className="px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {roleLabel}
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3 pb-6">
        {items.map((item) => {
          const Icon = iconMap[item.icon] ?? LayoutDashboard;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.title}</span>
              {item.icon === "Bell" && unreadCount > 0 && (
                <Badge
                  variant={isActive ? "secondary" : "default"}
                  className="h-5 min-w-5 justify-center px-1 text-[10px]"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
