/**
 * Centralized TanStack Query key factories.
 *
 * Keys are hierarchical tuples so prefix invalidation works:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.student.all })
 *
 * Workspace-scoped keys include workspaceId as the last segment so cache
 * does not bleed across tenant switches.
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
    page: (page: string, userId?: string, workspaceId?: string | null) =>
      ["student", page, userId, workspaceId ?? null] as const,
    dashboard: (userId?: string, workspaceId?: string | null) =>
      ["student", "dashboard", userId, workspaceId ?? null] as const,
    team: (userId?: string, workspaceId?: string | null) =>
      ["student", "team", userId, workspaceId ?? null] as const,
    proposal: (userId?: string, workspaceId?: string | null) =>
      ["student", "proposal", userId, workspaceId ?? null] as const,
    workStream: (userId?: string, phaseId?: string | null, workspaceId?: string | null) =>
      ["student", "work-stream", userId, phaseId ?? "all", workspaceId ?? null] as const,
    workStreamPrefix: () => ["student", "work-stream"] as const,
    tasks: (userId?: string, workspaceId?: string | null) =>
      ["student", "tasks", userId, workspaceId ?? null] as const,
    milestones: (userId?: string, workspaceId?: string | null) =>
      ["student", "milestones", userId, workspaceId ?? null] as const,
    milestonesPrefix: () => ["student", "milestones"] as const,
    evaluations: (userId?: string, workspaceId?: string | null) =>
      ["student", "evaluations", userId, workspaceId ?? null] as const,
    results: (userId?: string, workspaceId?: string | null) =>
      ["student", "results", userId, workspaceId ?? null] as const,
    submissionResults: (
      filters?: Record<string, string | undefined>,
      workspaceId?: string | null,
    ) =>
      [
        "student",
        "submission-results",
        filters ?? null,
        workspaceId ?? null,
      ] as const,
    notifications: (userId?: string, page = 1, limit = 20) =>
      ["student", "notifications", userId, page, limit] as const,
    notificationsList: (
      page: number,
      readFilter = "all",
      workspaceId?: string | null,
    ) => ["student", "me", page, readFilter, workspaceId ?? null] as const,
    profile: (userId?: string, workspaceId?: string | null) =>
      ["student", "profile", userId, workspaceId ?? null] as const,
  },

  supervisor: {
    all: ["supervisor"] as const,
    page: (
      page: string,
      userId?: string,
      extra?: unknown,
      workspaceId?: string | null,
    ) =>
      extra !== undefined
        ? (["supervisor", page, userId, extra, workspaceId ?? null] as const)
        : (["supervisor", page, userId, workspaceId ?? null] as const),
    dashboard: (userId?: string, workspaceId?: string | null) =>
      ["supervisor", "dashboard", userId, workspaceId ?? null] as const,
    teams: (userId?: string, workspaceId?: string | null) =>
      ["supervisor", "teams", userId, workspaceId ?? null] as const,
    workStream: (
      userId?: string,
      teamFilterKey?: string,
      phaseFilterKey?: string,
      workspaceId?: string | null,
    ) =>
      teamFilterKey !== undefined
        ? (["supervisor", "work-stream", userId, teamFilterKey, phaseFilterKey ?? "all", workspaceId ?? null] as const)
        : (["supervisor", "work-stream", userId, workspaceId ?? null] as const),
    requests: (userId?: string, workspaceId?: string | null) =>
      ["supervisor", "requests", userId, workspaceId ?? null] as const,
    invitations: (userId?: string, workspaceId?: string | null) =>
      ["supervisor", "invitations", userId, workspaceId ?? null] as const,
    milestones: (
      userId?: string,
      teamFilterKey?: string,
      workspaceId?: string | null,
    ) =>
      teamFilterKey !== undefined
        ? (["supervisor", "milestones", userId, teamFilterKey, workspaceId ?? null] as const)
        : (["supervisor", "milestones", userId, workspaceId ?? null] as const),
    milestonesPrefix: () => ["supervisor", "milestones"] as const,
    workStreamPrefix: () => ["supervisor", "work-stream"] as const,
    evaluations: (userId?: string, workspaceId?: string | null) =>
      ["supervisor", "evaluations", userId, workspaceId ?? null] as const,
    submissionResults: (
      filters?: Record<string, string | undefined>,
      workspaceId?: string | null,
    ) =>
      [
        "supervisor",
        "submission-results",
        filters ?? null,
        workspaceId ?? null,
      ] as const,
    notifications: (userId?: string, page = 1, limit = 20) =>
      ["supervisor", "notifications", userId, page, limit] as const,
    notificationsList: (
      page: number,
      readFilter = "all",
      workspaceId?: string | null,
    ) => ["supervisor", "me", page, readFilter, workspaceId ?? null] as const,
    profile: (userId?: string, workspaceId?: string | null) =>
      ["supervisor", "profile", userId, workspaceId ?? null] as const,
    overview: (supervisorId: string, workspaceId?: string | null) =>
      ["supervisor-overview", supervisorId, workspaceId ?? null] as const,
  },

  coordinator: {
    all: ["coordinator"] as const,
    page: (page: string, userId?: string, workspaceId?: string | null) =>
      ["coordinator", page, userId, workspaceId ?? null] as const,
    dashboard: (userId?: string, workspaceId?: string | null) =>
      ["coordinator", "dashboard", userId, workspaceId ?? null] as const,
    profile: (userId?: string, workspaceId?: string | null) =>
      ["coordinator", "profile", userId, workspaceId ?? null] as const,
    analytics: (userId?: string, workspaceId?: string | null) =>
      ["coordinator", "analytics", userId, workspaceId ?? null] as const,
    users: (userId?: string, workspaceId?: string | null) =>
      ["coordinator", "users", userId, workspaceId ?? null] as const,
    teams: (userId?: string, workspaceId?: string | null) =>
      ["coordinator", "teams", userId, workspaceId ?? null] as const,
    proposals: (userId?: string, workspaceId?: string | null) =>
      ["coordinator", "proposals", userId, workspaceId ?? null] as const,
    evaluations: (userId?: string, workspaceId?: string | null) =>
      ["coordinator", "evaluations", userId, workspaceId ?? null] as const,
    results: (userId?: string, workspaceId?: string | null) =>
      ["coordinator", "results", userId, workspaceId ?? null] as const,
    announcements: (userId?: string, workspaceId?: string | null) =>
      ["coordinator", "announcements", userId, workspaceId ?? null] as const,
    notificationsList: (
      page: number,
      readFilter = "all",
      workspaceId?: string | null,
    ) => ["coordinator", "me", page, readFilter, workspaceId ?? null] as const,
    systemHealth: (userId?: string, workspaceId?: string | null) =>
      ["coordinator", "system-health", userId, workspaceId ?? null] as const,
    userDetail: (userId: string, workspaceId?: string | null) =>
      ["coordinator", "user-detail", userId, workspaceId ?? null] as const,
    evaluatorOverview: (workspaceId?: string | null) =>
      ["coordinator", "evaluator-overview", workspaceId ?? null] as const,
    invitations: (workspaceId?: string | null) =>
      ["coordinator", "invitations", workspaceId ?? null] as const,
    allTeams: (workspaceId?: string | null) =>
      ["coordinator", "all-teams", workspaceId ?? null] as const,
    phases: (workspaceId?: string | null) =>
      ["coordinator", "phases", workspaceId ?? null] as const,
    deliverableTemplates: (phaseId?: string, workspaceId?: string | null) =>
      ["coordinator", "deliverable-templates", phaseId ?? null, workspaceId ?? null] as const,
    finalizedSubmissions: (phaseId?: string, page = 1, workspaceId?: string | null) =>
      ["coordinator", "finalized-submissions", phaseId ?? null, page, workspaceId ?? null] as const,
    submissionOverview: (phaseId?: string, workspaceId?: string | null) =>
      ["coordinator", "submission-overview", phaseId ?? null, workspaceId ?? null] as const,
    submissionEvaluations: (
      phaseId?: string,
      status?: string,
      workspaceId?: string | null,
    ) =>
      [
        "coordinator",
        "submission-evaluations",
        phaseId ?? null,
        status ?? null,
        workspaceId ?? null,
      ] as const,
    evaluators: (workspaceId?: string | null) =>
      ["coordinator", "evaluators", workspaceId ?? null] as const,
    submissionResults: (
      filters?: Record<string, string | undefined> | string,
      workspaceId?: string | null,
    ) =>
      ["coordinator", "submission-results", filters ?? null, workspaceId ?? null] as const,
  },

  phases: {
    all: ["phases"] as const,
    list: (workspaceId?: string | null) =>
      ["phases", "list", workspaceId ?? null] as const,
  },

  deliverableTemplates: {
    all: ["deliverable-templates"] as const,
    list: (phaseId?: string, workspaceId?: string | null) =>
      ["deliverable-templates", "list", phaseId ?? null, workspaceId ?? null] as const,
  },

  evaluator: {
    all: ["evaluator"] as const,
    dashboard: (workspaceId?: string | null) =>
      ["evaluator", "dashboard", workspaceId ?? null] as const,
    evaluations: (workspaceId?: string | null) =>
      ["evaluator", "evaluations", workspaceId ?? null] as const,
    evaluationDetail: (evaluationId: string, workspaceId?: string | null) =>
      ["evaluator", "evaluation", evaluationId, workspaceId ?? null] as const,
    results: (workspaceId?: string | null) =>
      ["evaluator", "results", workspaceId ?? null] as const,
  },

  teams: {
    all: ["teams"] as const,
    browse: (search: string, workspaceId?: string | null) =>
      ["teams", "browse", search, workspaceId ?? null] as const,
    browseDetails: (teamId: string, workspaceId?: string | null) =>
      ["teams", "browse-details", teamId, workspaceId ?? null] as const,
    mine: (workspaceId?: string | null) => ["team", workspaceId ?? null] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    unreadCount: (userId?: string, workspaceId?: string | null) =>
      ["notifications", "unread-count", userId, workspaceId ?? null] as const,
    unreadPreview: (userId?: string, workspaceId?: string | null) =>
      ["notifications", "unread-preview", userId, workspaceId ?? null] as const,
    recentActivity: (workspaceId?: string | null) =>
      ["notifications", "recent-activity", workspaceId ?? null] as const,
  },

  profiles: {
    all: ["profiles"] as const,
    batch: (ids: string[]) =>
      ["profiles", "batch", [...ids].sort().join(",")] as const,
    byId: (authUserId: string) => ["profile", authUserId] as const,
  },

  activityLogs: {
    all: ["activity-logs"] as const,
    mine: (workspaceId?: string | null) =>
      ["activity-logs", "my", workspaceId ?? null] as const,
  },

  proposal: {
    all: ["proposal"] as const,
  },

  submissions: {
    all: ["submissions"] as const,
    detail: (submissionId: string, workspaceId?: string | null) =>
      ["submissions", "detail", submissionId, workspaceId ?? null] as const,
  },

  organizations: {
    plans: () => ["organizations", "plans"] as const,
  },

  superAdmin: {
    all: ["super-admin"] as const,
    workspaces: (includeArchived = false) =>
      ["super-admin", "workspaces", includeArchived] as const,
  },
} as const;
