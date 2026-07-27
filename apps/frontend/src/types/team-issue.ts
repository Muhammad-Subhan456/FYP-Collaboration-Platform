export type TeamIssueStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLOSED"
  | "ARCHIVED";

export type TeamIssuePriority = "LOW" | "MEDIUM" | "HIGH";

export type TeamIssueActivityType =
  | "CREATED"
  | "CLAIMED"
  | "RELEASED"
  | "COMPLETED"
  | "COMMENTED"
  | "UPDATED";

export interface TeamIssueComment {
  id: string;
  issueId: string;
  teamId: string;
  authUserId: string;
  body: string;
  createdAt: string;
  authorName?: string;
}

export interface TeamIssueActivity {
  id: string;
  issueId: string;
  teamId: string;
  actorId: string;
  type: TeamIssueActivityType;
  description?: string | null;
  createdAt: string;
}

export interface TeamIssue {
  id: string;
  teamId: string;
  title: string;
  description: string;
  priority: TeamIssuePriority;
  labels: string[];
  status: TeamIssueStatus;
  assignedToId?: string | null;
  githubPrUrl?: string | null;
  githubCommitUrl?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  comments?: TeamIssueComment[];
  activities?: TeamIssueActivity[];
}

export interface TeamIssueSummaries {
  open: number;
  assignedToMe?: number;
  inProgress?: number;
  recentlyCompleted: number;
}

export interface StudentMilestonesPageData {
  team: { id: string; name: string } | null;
  issues: TeamIssue[];
  profiles: Record<string, import("@/types/profile").UserProfile>;
  summaries: TeamIssueSummaries;
}

export interface SupervisorMilestonesTeam {
  id: string;
  name: string;
}

export interface SupervisorMilestonesPageData {
  teams: SupervisorMilestonesTeam[];
  selectedTeamId: string | null;
  issues: TeamIssue[];
  profiles: Record<string, import("@/types/profile").UserProfile>;
  summaries: TeamIssueSummaries;
}

export interface CreateTeamIssueInput {
  title: string;
  description: string;
  priority?: TeamIssuePriority;
  labels?: string[];
}

export interface UpdateTeamIssueInput {
  title?: string;
  description?: string;
  priority?: TeamIssuePriority;
  labels?: string[];
}

export interface CompleteTeamIssueInput {
  githubPrUrl?: string;
  githubCommitUrl?: string;
}
