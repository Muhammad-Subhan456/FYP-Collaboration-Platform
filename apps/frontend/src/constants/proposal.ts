// Mirrors apps/foasis-backend/src/proposals/proposal-constants.ts.
// Keep the two files in sync when the university template changes.

export const PROJECT_DOMAINS = [
  "Artificial Intelligence (AI)",
  "Computer Vision",
  "Digital Image Processing",
  "Natural Language Processing (NLP)",
  "Data Science & Analytics",
  "Big Data Computing",
  "Web Development",
  "Mobile Application Development",
  "Desktop Application Development",
  "Software Engineering",
  "Information / Enterprise Systems",
  "Database Systems",
  "Distributed Systems",
  "High Performance Computing (HPC)",
  "Cybersecurity & Digital Forensics",
  "Computer Networks",
  "Cloud Computing",
  "Internet of Things (IoT)",
  "Embedded Systems",
  "Robotics & Intelligent Systems",
  "Blockchain Technologies",
  "Human-Computer Interaction (HCI)",
  "Augmented Reality (AR) / Virtual Reality (VR)",
  "Geographic Information Systems (GIS) & Remote Sensing",
  "Bioinformatics / Health Informatics",
  "Game Development",
] as const;

export type ProjectDomain = (typeof PROJECT_DOMAINS)[number];

export type ProjectNature =
  | "DEVELOPMENT"
  | "RESEARCH_AND_DEVELOPMENT"
  | "HYBRID";

export const PROJECT_NATURE_OPTIONS: Array<{
  value: ProjectNature;
  label: string;
}> = [
  { value: "DEVELOPMENT", label: "Development" },
  { value: "RESEARCH_AND_DEVELOPMENT", label: "Research & Development" },
  { value: "HYBRID", label: "Hybrid" },
];

export function formatProjectNature(
  nature: ProjectNature | null | undefined,
): string {
  if (!nature) return "—";
  return (
    PROJECT_NATURE_OPTIONS.find((option) => option.value === nature)?.label ??
    nature
  );
}

export const SUSTAINABLE_DEVELOPMENT_GOALS: Array<{
  id: number;
  title: string;
}> = [
  { id: 1, title: "No Poverty" },
  { id: 2, title: "Zero Hunger" },
  { id: 3, title: "Good Health and Well-being" },
  { id: 4, title: "Quality Education" },
  { id: 5, title: "Gender Equality" },
  { id: 6, title: "Clean Water and Sanitation" },
  { id: 7, title: "Affordable and Clean Energy" },
  { id: 8, title: "Decent Work and Economic Growth" },
  { id: 9, title: "Industry, Innovation and Infrastructure" },
  { id: 10, title: "Reduced Inequalities" },
  { id: 11, title: "Sustainable Cities and Communities" },
  { id: 12, title: "Responsible Consumption and Production" },
  { id: 13, title: "Climate Action" },
  { id: 14, title: "Life Below Water" },
  { id: 15, title: "Life on Land" },
  { id: 16, title: "Peace, Justice and Strong Institutions" },
  { id: 17, title: "Partnerships for the Goals" },
];

export function sdgLabel(id: number): string {
  const sdg = SUSTAINABLE_DEVELOPMENT_GOALS.find((item) => item.id === id);
  return sdg ? `SDG-${sdg.id} — ${sdg.title}` : `SDG-${id}`;
}

export function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Proposal content rules from the university template.
export const ABSTRACT_MIN_WORDS = 400;
export const ABSTRACT_MAX_WORDS = 500;
export const PREVIOUS_OBJECTIVES_MAX_WORDS = 500;
export const SDG_JUSTIFICATION_MIN_WORDS = 50;
export const SDG_JUSTIFICATION_MAX_WORDS = 100;
export const MAX_TEAM_MEMBERS = 4;
