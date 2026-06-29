import api from "@/lib/axios";
import type {
  CompleteTeamIssueInput,
  CreateTeamIssueInput,
  TeamIssue,
  TeamIssueComment,
  UpdateTeamIssueInput,
} from "@/types/team-issue";

export const teamIssueService = {
  create: async (input: CreateTeamIssueInput) => {
    const res = await api.post<TeamIssue>("/team-issues", input);
    return res.data;
  },

  update: async (issueId: string, input: UpdateTeamIssueInput) => {
    const res = await api.patch<TeamIssue>(
      `/team-issues/${issueId}`,
      input,
    );
    return res.data;
  },

  claim: async (issueId: string) => {
    const res = await api.post<TeamIssue>(
      `/team-issues/${issueId}/claim`,
    );
    return res.data;
  },

  release: async (issueId: string) => {
    const res = await api.post<TeamIssue>(
      `/team-issues/${issueId}/release`,
    );
    return res.data;
  },

  complete: async (
    issueId: string,
    input: CompleteTeamIssueInput,
  ) => {
    const res = await api.post<TeamIssue>(
      `/team-issues/${issueId}/complete`,
      input,
    );
    return res.data;
  },

  comment: async (issueId: string, body: string) => {
    const res = await api.post<TeamIssueComment>(
      `/team-issues/${issueId}/comments`,
      { body },
    );
    return res.data;
  },

  getOne: async (issueId: string) => {
    const res = await api.get<TeamIssue>(`/team-issues/${issueId}`);
    return res.data;
  },
};
