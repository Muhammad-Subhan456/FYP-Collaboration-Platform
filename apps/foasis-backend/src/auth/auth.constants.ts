export const AUTH_TOKEN_TYPES = {
  ACCESS: 'access',
  CONTEXT_SELECTION: 'context_selection',
} as const;

export type AuthContextOption = {
  workspaceId: string;
  workspaceName: string;
  role: string;
};
