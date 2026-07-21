import { z } from "zod";

import {
  ABSTRACT_MAX_WORDS,
  PREVIOUS_OBJECTIVES_MAX_WORDS,
  PROJECT_DOMAINS,
  SDG_JUSTIFICATION_MAX_WORDS,
  SDG_JUSTIFICATION_MIN_WORDS,
  countWords,
} from "@/constants/proposal";

const domainValues = PROJECT_DOMAINS as unknown as [string, ...string[]];

export const proposalAuthoringSchema = z
  .object({
    name: z.string().trim().min(2, "Team name is required"),
    projectTitle: z
      .string()
      .trim()
      .min(5, "Project title must be at least 5 characters"),
    nature: z.enum(
      ["DEVELOPMENT", "RESEARCH_AND_DEVELOPMENT", "HYBRID"],
      { message: "Select the nature of the project" },
    ),
    domains: z.array(z.enum(domainValues)),
    otherDomain: z
      .string()
      .trim()
      .max(150, "Other domain must be at most 150 characters")
      .optional()
      .or(z.literal("")),
    sdgs: z
      .array(z.number().int().min(1).max(17))
      .min(1, "Select at least one Sustainable Development Goal"),
    sdgJustification: z.string().trim(),
    abstract: z.string().trim().optional().or(z.literal("")),
    previousObjectives: z.string().trim().optional().or(z.literal("")),
  })
  .refine(
    (data) =>
      data.domains.length > 0 ||
      (!!data.otherDomain && data.otherDomain.trim().length > 0),
    {
      message: 'Select at least one project domain or specify "Other"',
      path: ["domains"],
    },
  )
  .refine(
    (data) => countWords(data.abstract) <= ABSTRACT_MAX_WORDS,
    {
      message: `Abstract must be at most ${ABSTRACT_MAX_WORDS} words`,
      path: ["abstract"],
    },
  )
  .refine(
    (data) => countWords(data.previousObjectives) <= PREVIOUS_OBJECTIVES_MAX_WORDS,
    {
      message: `Previous project objectives must be at most ${PREVIOUS_OBJECTIVES_MAX_WORDS} words`,
      path: ["previousObjectives"],
    },
  )
  .refine(
    (data) => {
      const words = countWords(data.sdgJustification);
      return (
        words >= SDG_JUSTIFICATION_MIN_WORDS &&
        words <= SDG_JUSTIFICATION_MAX_WORDS
      );
    },
    {
      message: `Justification must be between ${SDG_JUSTIFICATION_MIN_WORDS} and ${SDG_JUSTIFICATION_MAX_WORDS} words`,
      path: ["sdgJustification"],
    },
  );

export type ProposalAuthoringValues = z.infer<typeof proposalAuthoringSchema>;
