export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coordinatorEmail: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    teams: number;
  };
}

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  coordinatorEmail: string;
  description?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  slug?: string;
  coordinatorEmail?: string;
  description?: string;
}
