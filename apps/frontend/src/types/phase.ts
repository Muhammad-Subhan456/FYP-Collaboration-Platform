export type PhaseStatus = "ACTIVE" | "INACTIVE" | "PUBLISHED";

export interface Phase {
  id: string;
  workspaceId: string;
  name: string;
  creditHours: number;
  description?: string | null;
  status: PhaseStatus;
  sortOrder: number;
  isConfigurationPublished?: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    templates: number;
    deliverables: number;
  };
}

export interface CreatePhaseInput {
  name: string;
  creditHours: number;
  description?: string;
  status?: PhaseStatus;
  sortOrder?: number;
}

export interface UpdatePhaseInput {
  name?: string;
  creditHours?: number;
  description?: string;
  status?: PhaseStatus;
  sortOrder?: number;
}

export interface RubricCriterion {
  id: string;
  templateId: string;
  title: string;
  description?: string | null;
  maxMarks: number;
  sortOrder: number;
}

export interface DeliverableTemplateAttachment {
  id: string;
  templateId: string;
  fileUrl: string;
  fileName: string;
  createdAt: string;
}

export interface DeliverableTemplate {
  id: string;
  workspaceId: string;
  phaseId: string;
  coordinatorId: string;
  title: string;
  description: string;
  type: string;
  dueDate?: string | null;
  totalMarks: number;
  weightagePercent?: number;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  phase?: Phase;
  rubricCriteria: RubricCriterion[];
  attachments: DeliverableTemplateAttachment[];
  _count?: { deliverables: number };
}

export interface RubricCriterionInput {
  id?: string;
  title: string;
  description?: string;
  maxMarks: number;
  sortOrder?: number;
}

export interface CreateDeliverableTemplateInput {
  phaseId: string;
  title: string;
  description: string;
  type: string;
  dueDate?: string;
  totalMarks: number;
  weightagePercent?: number;
  rubricCriteria: RubricCriterionInput[];
  attachments?: Array<{ fileUrl: string; fileName: string }>;
}

export interface UpdateDeliverableTemplateInput {
  phaseId?: string;
  title?: string;
  description?: string;
  type?: string;
  dueDate?: string | null;
  totalMarks?: number;
  weightagePercent?: number;
  rubricCriteria?: RubricCriterionInput[];
  attachments?: Array<{ fileUrl: string; fileName: string }>;
}

export interface PublishDeliverableTemplateInput {
  templateId: string;
  teamIds: string[];
  dueDate?: string;
  teamDueDates?: Array<{ teamId: string; dueDate: string }>;
}
