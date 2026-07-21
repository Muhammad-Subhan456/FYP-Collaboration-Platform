import { randomInt } from 'crypto';
import type { ProjectNature } from '@prisma/client';

/**
 * Canonical Area of Specialization / Project Domain list from the official
 * Department of Computer Science FYDP Proposal Template. Free-text values are
 * only allowed via the separate `otherDomain` field.
 */
export const PROJECT_DOMAINS = [
  'Artificial Intelligence (AI)',
  'Computer Vision',
  'Digital Image Processing',
  'Natural Language Processing (NLP)',
  'Data Science & Analytics',
  'Big Data Computing',
  'Web Development',
  'Mobile Application Development',
  'Desktop Application Development',
  'Software Engineering',
  'Information / Enterprise Systems',
  'Database Systems',
  'Distributed Systems',
  'High Performance Computing (HPC)',
  'Cybersecurity & Digital Forensics',
  'Computer Networks',
  'Cloud Computing',
  'Internet of Things (IoT)',
  'Embedded Systems',
  'Robotics & Intelligent Systems',
  'Blockchain Technologies',
  'Human-Computer Interaction (HCI)',
  'Augmented Reality (AR) / Virtual Reality (VR)',
  'Geographic Information Systems (GIS) & Remote Sensing',
  'Bioinformatics / Health Informatics',
  'Game Development',
] as const;

export type ProjectDomain = (typeof PROJECT_DOMAINS)[number];

export function isValidDomain(value: string): boolean {
  return (PROJECT_DOMAINS as readonly string[]).includes(value);
}

/** UN Sustainable Development Goals (1–17). */
export const SUSTAINABLE_DEVELOPMENT_GOALS: Array<{
  id: number;
  title: string;
}> = [
  { id: 1, title: 'No Poverty' },
  { id: 2, title: 'Zero Hunger' },
  { id: 3, title: 'Good Health and Well-being' },
  { id: 4, title: 'Quality Education' },
  { id: 5, title: 'Gender Equality' },
  { id: 6, title: 'Clean Water and Sanitation' },
  { id: 7, title: 'Affordable and Clean Energy' },
  { id: 8, title: 'Decent Work and Economic Growth' },
  { id: 9, title: 'Industry, Innovation and Infrastructure' },
  { id: 10, title: 'Reduced Inequalities' },
  { id: 11, title: 'Sustainable Cities and Communities' },
  { id: 12, title: 'Responsible Consumption and Production' },
  { id: 13, title: 'Climate Action' },
  { id: 14, title: 'Life Below Water' },
  { id: 15, title: 'Life on Land' },
  { id: 16, title: 'Peace, Justice and Strong Institutions' },
  { id: 17, title: 'Partnerships for the Goals' },
];

export const SDG_IDS = SUSTAINABLE_DEVELOPMENT_GOALS.map((sdg) => sdg.id);

export function isValidSdg(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= 17;
}

/** Word-count helper shared by abstract / objectives / justification rules. */
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
export const MAX_PROJECT_DOMAINS = PROJECT_DOMAINS.length;
export const MAX_TEAM_MEMBERS = 4;

export interface ProposalContentInput {
  nature?: ProjectNature | null;
  domains?: string[] | null;
  otherDomain?: string | null;
  abstract?: string | null;
  previousObjectives?: string | null;
  sdgs?: number[] | null;
  sdgJustification?: string | null;
}

/**
 * Validates the university proposal content (registration + SDGs + content).
 * Returns a list of human-readable errors; an empty array means valid.
 */
export function validateProposalContent(
  input: ProposalContentInput,
): string[] {
  const errors: string[] = [];

  if (!input.nature) {
    errors.push('Select the nature of the project');
  }

  const domains = (input.domains ?? []).filter(Boolean);
  const otherDomain = input.otherDomain?.trim();
  if (domains.length === 0 && !otherDomain) {
    errors.push('Select at least one project domain or specify "Other"');
  }
  for (const domain of domains) {
    if (!isValidDomain(domain)) {
      errors.push(`Invalid project domain: ${domain}`);
    }
  }

  const abstractWords = countWords(input.abstract);
  if (abstractWords > ABSTRACT_MAX_WORDS) {
    errors.push(
      `Abstract must be at most ${ABSTRACT_MAX_WORDS} words (currently ${abstractWords})`,
    );
  }

  const previousWords = countWords(input.previousObjectives);
  if (previousWords > PREVIOUS_OBJECTIVES_MAX_WORDS) {
    errors.push(
      `Previous project objectives must be at most ${PREVIOUS_OBJECTIVES_MAX_WORDS} words (currently ${previousWords})`,
    );
  }

  const sdgs = input.sdgs ?? [];
  if (sdgs.length === 0) {
    errors.push('Select at least one Sustainable Development Goal');
  }
  for (const sdg of sdgs) {
    if (!isValidSdg(sdg)) {
      errors.push(`Invalid Sustainable Development Goal: ${sdg}`);
    }
  }

  if (sdgs.length > 0) {
    const justificationWords = countWords(input.sdgJustification);
    if (
      justificationWords < SDG_JUSTIFICATION_MIN_WORDS ||
      justificationWords > SDG_JUSTIFICATION_MAX_WORDS
    ) {
      errors.push(
        `SDG justification must be between ${SDG_JUSTIFICATION_MIN_WORDS} and ${SDG_JUSTIFICATION_MAX_WORDS} words (currently ${justificationWords})`,
      );
    }
  }

  return errors;
}

const PROJECT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a short, human-readable Project ID, e.g. `FYP-2026-AB2K`.
 * Uniqueness is enforced at the database level (`Proposal.projectCode @unique`).
 */
export function generateProjectCode(date = new Date()): string {
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += PROJECT_CODE_ALPHABET[randomInt(PROJECT_CODE_ALPHABET.length)];
  }
  return `FYP-${date.getFullYear()}-${suffix}`;
}
