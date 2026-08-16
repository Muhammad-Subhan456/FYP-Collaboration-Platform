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
  { title: "Calendar", href: "/student/calendar", icon: "CalendarDays" },
  { title: "Milestones", href: "/student/milestones", icon: "Flag" },
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
  { title: "Calendar", href: "/supervisor/calendar", icon: "CalendarDays" },
  { title: "Milestones", href: "/supervisor/milestones", icon: "Flag" },
  { title: "Results", href: "/supervisor/results", icon: "Award" },
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
  { title: "Phases", href: "/coordinator/phases", icon: "Layers" },
  { title: "Deliverable Templates", href: "/coordinator/deliverable-templates", icon: "FileStack" },
  { title: "Calendar", href: "/coordinator/calendar", icon: "CalendarDays" },
  { title: "Submissions", href: "/coordinator/submissions", icon: "FileCheck" },
  { title: "Evaluations", href: "/coordinator/evaluations", icon: "Calendar" },
  { title: "Results", href: "/coordinator/results", icon: "Award" },
  { title: "Analytics", href: "/coordinator/analytics", icon: "BarChart3" },
  { title: "Notifications", href: "/coordinator/notifications", icon: "Bell" },
  { title: "Settings", href: "/coordinator/settings", icon: "Settings" },
  { title: "Profile", href: "/coordinator/profile", icon: "User" },
];

export const SUPER_ADMIN_NAV: NavItemConfig[] = [
  { title: "Workspaces", href: "/super-admin/workspaces", icon: "Building2" },
  { title: "System Health", href: "/super-admin/system-health", icon: "Server" },
];

export const EVALUATOR_NAV: NavItemConfig[] = [
  { title: "Dashboard", href: "/evaluator/dashboard", icon: "LayoutDashboard" },
  { title: "Evaluations", href: "/evaluator/evaluations", icon: "Calendar" },
  { title: "Notifications", href: "/evaluator/notifications", icon: "Bell" },
  { title: "Profile", href: "/evaluator/profile", icon: "User" },
];

export function getNavForRole(role: UserRole): NavItemConfig[] {
  switch (role) {
    case "STUDENT":
      return STUDENT_NAV;
    case "SUPERVISOR":
      return SUPERVISOR_NAV;
    case "COORDINATOR":
      return COORDINATOR_NAV;
    case "EVALUATOR":
      return EVALUATOR_NAV;
    case "SUPER_ADMIN":
      return SUPER_ADMIN_NAV;
    default:
      return [];
  }
}

export function getOnboardingPath(role: UserRole) {
  return `/auth/onboarding/${role.toLowerCase()}`;
}
