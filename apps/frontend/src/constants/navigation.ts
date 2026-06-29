import type { UserRole } from "@/types";

export interface NavItemConfig {
  title: string;
  href: string;
  icon: string;
}

export const STUDENT_NAV: NavItemConfig[] = [
  { title: "Dashboard", href: "/student/dashboard", icon: "LayoutDashboard" },
  { title: "Team", href: "/student/team", icon: "Users" },
  { title: "Proposal", href: "/student/proposal", icon: "FileText" },
  { title: "Work Stream", href: "/student/work-stream", icon: "Megaphone" },
  { title: "Milestones", href: "/student/milestones", icon: "Flag" },
  { title: "My Tasks", href: "/student/tasks", icon: "CheckSquare" },
  { title: "Evaluations", href: "/student/evaluations", icon: "Calendar" },
  { title: "Results", href: "/student/results", icon: "Award" },
  { title: "Notifications", href: "/student/notifications", icon: "Bell" },
  { title: "Profile", href: "/student/profile", icon: "User" },
];

export const SUPERVISOR_NAV: NavItemConfig[] = [
  { title: "Dashboard", href: "/supervisor/dashboard", icon: "LayoutDashboard" },
  { title: "Proposals", href: "/supervisor/requests", icon: "Inbox" },
  { title: "Browse Teams", href: "/supervisor/invitations", icon: "Mail" },
  { title: "Work Stream", href: "/supervisor/work-stream", icon: "Megaphone" },
  { title: "Milestones", href: "/supervisor/milestones", icon: "Flag" },
  { title: "Evaluations", href: "/supervisor/evaluations", icon: "Calendar" },
  { title: "Teams", href: "/supervisor/teams", icon: "Users" },
  { title: "Notifications", href: "/supervisor/notifications", icon: "Bell" },
  { title: "Profile", href: "/supervisor/profile", icon: "User" },
];

export const COORDINATOR_NAV: NavItemConfig[] = [
  { title: "Dashboard", href: "/coordinator/dashboard", icon: "LayoutDashboard" },
  { title: "Users", href: "/coordinator/users", icon: "UserCog" },
  { title: "Teams", href: "/coordinator/teams", icon: "Users" },
  { title: "Proposals", href: "/coordinator/proposals", icon: "FileText" },
  { title: "Announcements", href: "/coordinator/announcements", icon: "Megaphone" },
  { title: "Evaluations", href: "/coordinator/evaluations", icon: "Calendar" },
  { title: "Results", href: "/coordinator/results", icon: "Award" },
  { title: "Analytics", href: "/coordinator/analytics", icon: "BarChart3" },
  { title: "System Health", href: "/coordinator/system-health", icon: "Server" },
  { title: "Notifications", href: "/coordinator/notifications", icon: "Bell" },
  { title: "Profile", href: "/coordinator/profile", icon: "User" },
];

export function getNavForRole(role: UserRole): NavItemConfig[] {
  switch (role) {
    case "STUDENT":
      return STUDENT_NAV;
    case "SUPERVISOR":
      return SUPERVISOR_NAV;
    case "COORDINATOR":
      return COORDINATOR_NAV;
    default:
      return [];
  }
}

export function getOnboardingPath(role: UserRole) {
  return `/auth/onboarding/${role.toLowerCase()}`;
}
