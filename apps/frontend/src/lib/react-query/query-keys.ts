/**
 * Centralized TanStack Query key factories.
 *
 * Keys are hierarchical tuples so prefix invalidation works:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.student.all })
 *
 * During migration, existing inline keys should be replaced page-by-page
 * with these factories. Do not bulk-replace until each page is validated.
 */

export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    /** @deprecated Prefer queryKeys.{role}.dashboard() */
    overview: (role: string, userId?: string) =>
      [role.toLowerCase(), "dashboard", userId] as const,
  },

  student: {
    all: ["student"] as const,
    page: (page: string, userId?: string) =>
      ["student", page, userId] as const,
    dashboard: (userId?: string) =>
      ["student", "dashboard", userId] as const,
    team: (userId?: string) => ["student", "team", userId] as const,
    proposal: (userId?: string) => ["student", "proposal", userId] as const,
    workStream: (userId?: string) =>
      ["student", "work-stream", userId] as const,
    tasks: (userId?: string) => ["student", "tasks", userId] as const,
    milestones: (userId?: string) =>
      ["student", "milestones", userId] as const,
    evaluations: (userId?: string) =>
      ["student", "evaluations", userId] as const,
    results: (userId?: string) => ["student", "results", userId] as const,
    notifications: (userId?: string, page = 1, limit = 20) =>
      ["student", "notifications", userId, page, limit] as const,
    notificationsList: (page: number) =>
      ["student", "me", page] as const,
    profile: (userId?: string) => ["student", "profile", userId] as const,
  },

  supervisor: {
    all: ["supervisor"] as const,
    page: (page: string, userId?: string, extra?: unknown) =>
      extra !== undefined
        ? (["supervisor", page, userId, extra] as const)
        : (["supervisor", page, userId] as const),
    dashboard: (userId?: string) =>
      ["supervisor", "dashboard", userId] as const,
    teams: (userId?: string) => ["supervisor", "teams", userId] as const,
    workStream: (userId?: string, teamFilterKey?: string) =>
      teamFilterKey !== undefined
        ? (["supervisor", "work-stream", userId, teamFilterKey] as const)
        : (["supervisor", "work-stream", userId] as const),
    requests: (userId?: string) =>
      ["supervisor", "requests", userId] as const,
    invitations: (userId?: string) =>
      ["supervisor", "invitations", userId] as const,
    milestones: (userId?: string) =>
      ["supervisor", "milestones", userId] as const,
    evaluations: (userId?: string) =>
      ["supervisor", "evaluations", userId] as const,
    notifications: (userId?: string, page = 1, limit = 20) =>
      ["supervisor", "notifications", userId, page, limit] as const,
    notificationsList: (page: number) =>
      ["supervisor", "me", page] as const,
    profile: (userId?: string) => ["supervisor", "profile", userId] as const,
    overview: (supervisorId: string) =>
      ["supervisor-overview", supervisorId] as const,
  },

  coordinator: {
    all: ["coordinator"] as const,
    page: (page: string, userId?: string) =>
      ["coordinator", page, userId] as const,
    dashboard: (userId?: string) =>
      ["coordinator", "dashboard", userId] as const,
    profile: (userId?: string) =>
      ["coordinator", "profile", userId] as const,
    analytics: (userId?: string) =>
      ["coordinator", "analytics", userId] as const,
    users: (userId?: string) => ["coordinator", "users", userId] as const,
    teams: (userId?: string) => ["coordinator", "teams", userId] as const,
    proposals: (userId?: string) =>
      ["coordinator", "proposals", userId] as const,
    evaluations: (userId?: string) =>
      ["coordinator", "evaluations", userId] as const,
    results: (userId?: string) => ["coordinator", "results", userId] as const,
    announcements: (userId?: string) =>
      ["coordinator", "announcements", userId] as const,
    notificationsList: (page: number) =>
      ["coordinator", "me", page] as const,
    systemHealth: (userId?: string) =>
      ["coordinator", "system-health", userId] as const,
    userDetail: (userId: string) =>
      ["coordinator", "user-detail", userId] as const,
    /** Panel evaluator assignment overview (coordinator evaluations UI). */
    evaluatorOverview: () => ["coordinator", "evaluator-overview"] as const,
    allTeams: () => ["coordinator", "all-teams"] as const,
  },

  teams: {
    all: ["teams"] as const,
    browse: (search: string) => ["teams", "browse", search] as const,
    mine: () => ["team"] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    unreadCount: (userId?: string) =>
      ["notifications", "unread-count", userId] as const,
    recentActivity: () => ["notifications", "recent-activity"] as const,
  },

  profiles: {
    all: ["profiles"] as const,
    batch: (ids: string[]) =>
      ["profiles", "batch", [...ids].sort().join(",")] as const,
    byId: (authUserId: string) => ["profile", authUserId] as const,
  },

  activityLogs: {
    all: ["activity-logs"] as const,
    mine: () => ["activity-logs", "my"] as const,
  },

  proposal: {
    all: ["proposal"] as const,
  },

  submissions: {
    all: ["submissions"] as const,
    detail: (submissionId: string) =>
      ["submissions", "detail", submissionId] as const,
  },

  organizations: {
    plans: () => ["organizations", "plans"] as const,
  },
} as const;
