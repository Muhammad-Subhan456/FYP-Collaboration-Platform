"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ExternalLink, FileText, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/axios";
import { getDisplayName } from "@/hooks/use-profiles";
import { uploadService } from "@/services/progress.service";
import {
  ABSTRACT_MAX_WORDS,
  ABSTRACT_MIN_WORDS,
  PREVIOUS_OBJECTIVES_MAX_WORDS,
  PROJECT_DOMAINS,
  PROJECT_NATURE_OPTIONS,
  SDG_JUSTIFICATION_MAX_WORDS,
  SDG_JUSTIFICATION_MIN_WORDS,
  SUSTAINABLE_DEVELOPMENT_GOALS,
  countWords,
} from "@/constants/proposal";
import {
  proposalAuthoringSchema,
  type ProposalAuthoringValues,
} from "@/lib/validation/proposal";
import type { UserProfile } from "@/types/profile";
import type { Team, TeamMember } from "@/types/student";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function resolveFileUrl(url: string) {
  return url.startsWith("http") ? url : `${apiBase}${url}`;
}

export interface ProposalUpdatePayload {
  name: string;
  projectTitle: string;
  projectAbstract: string;
  nature: ProposalAuthoringValues["nature"];
  domains: string[];
  otherDomain: string | null;
  sdgs: number[];
  sdgJustification: string;
  previousObjectives: string | null;
  proposalPdfUrl: string | null;
}

interface ProposalAuthoringFormProps {
  team: Team;
  members: TeamMember[];
  profiles?: Record<string, UserProfile>;
  projectCode?: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (payload: ProposalUpdatePayload) => void;
}

function WordCount({
  count,
  min,
  max,
}: {
  count: number;
  min?: number;
  max?: number;
}) {
  const tooLow = min != null && count < min;
  const tooHigh = max != null && count > max;
  const outOfRange = tooLow || tooHigh;
  return (
    <span
      className={
        outOfRange
          ? "text-xs font-medium text-destructive"
          : "text-xs text-muted-foreground"
      }
    >
      {count} words
      {min != null && max != null ? ` (recommended ${min}–${max})` : null}
      {max != null && min == null ? ` (max ${max})` : null}
    </span>
  );
}

export function ProposalAuthoringForm({
  team,
  members,
  profiles,
  projectCode,
  isSaving,
  onCancel,
  onSubmit,
}: ProposalAuthoringFormProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(
    team.proposalPdfUrl ?? null,
  );
  const [pdfFileName, setPdfFileName] = useState<string | null>(
    team.proposalPdfUrl ? "Current proposal.pdf" : null,
  );
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProposalAuthoringValues>({
    resolver: zodResolver(proposalAuthoringSchema),
    defaultValues: {
      name: team.name,
      projectTitle: team.projectTitle ?? "",
      nature: team.nature ?? undefined,
      domains: team.domains ?? [],
      otherDomain: team.otherDomain ?? "",
      sdgs: team.sdgs ?? [],
      sdgJustification: team.sdgJustification ?? "",
      abstract: team.projectAbstract ?? "",
      previousObjectives: team.previousObjectives ?? "",
    },
  });

  const nature = watch("nature");
  const domains = watch("domains") ?? [];
  const sdgs = watch("sdgs") ?? [];
  const abstractWords = countWords(watch("abstract"));
  const objectivesWords = countWords(watch("previousObjectives"));
  const justificationWords = countWords(watch("sdgJustification"));

  const toggleDomain = (value: string) => {
    const next = domains.includes(value)
      ? domains.filter((d) => d !== value)
      : [...domains, value];
    setValue("domains", next as ProposalAuthoringValues["domains"], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const toggleSdg = (id: number) => {
    const next = sdgs.includes(id)
      ? sdgs.filter((s) => s !== id)
      : [...sdgs, id].sort((a, b) => a - b);
    setValue("sdgs", next, { shouldDirty: true, shouldValidate: true });
  };

  const handlePdfUpload = async (file: File) => {
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      toast.error("Only PDF files are allowed");
      return;
    }
    setUploadingPdf(true);
    try {
      const uploaded = await uploadService.uploadProposalPdf(file);
      setPdfUrl(uploaded.fileUrl);
      setPdfFileName(file.name);
      toast.success("Proposal PDF uploaded");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setUploadingPdf(false);
    }
  };

  const submit = handleSubmit((values) => {
    onSubmit({
      name: values.name,
      projectTitle: values.projectTitle,
      projectAbstract: values.abstract?.trim() ?? "",
      nature: values.nature,
      domains: values.domains,
      otherDomain: values.otherDomain?.trim() || null,
      sdgs: values.sdgs,
      sdgJustification: values.sdgJustification,
      previousObjectives: values.previousObjectives?.trim() || null,
      proposalPdfUrl: pdfUrl,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-8">
      {/* ── Section: Project Registration ─────────────────────────── */}
      <section className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Project Registration
          </h3>
          {projectCode && (
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              Project ID: {projectCode}{" "}
              <span className="italic">(For Office Use Only)</span>
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Nature of Project</Label>
            <Select
              value={nature ?? ""}
              onValueChange={(v) =>
                setValue("nature", v as ProposalAuthoringValues["nature"], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select nature of project" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_NATURE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.nature && (
              <p className="text-sm text-destructive">
                {errors.nature.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectTitle">Project Title</Label>
          <Input id="projectTitle" {...register("projectTitle")} />
          {errors.projectTitle && (
            <p className="text-sm text-destructive">
              {errors.projectTitle.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Area of Specialization / Project Domain</Label>
          <p className="text-xs text-muted-foreground">
            Select all domains that apply.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECT_DOMAINS.map((domain) => {
              const checked = domains.includes(domain);
              return (
                <label
                  key={domain}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm transition-colors ${
                    checked
                      ? "border-primary/50 bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    onChange={() => toggleDomain(domain)}
                  />
                  <span>{domain}</span>
                </label>
              );
            })}
          </div>
          {errors.domains && (
            <p className="text-sm text-destructive">
              {errors.domains.message as string}
            </p>
          )}
          <div className="space-y-2 pt-1">
            <Label htmlFor="otherDomain">Other (Specify)</Label>
            <Input
              id="otherDomain"
              placeholder="Any domain not listed above"
              {...register("otherDomain")}
            />
            {errors.otherDomain && (
              <p className="text-sm text-destructive">
                {errors.otherDomain.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Project Group Members</Label>
          <p className="text-xs text-muted-foreground">
            Pulled automatically from member profiles (up to 4 members).
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Roll Number</th>
                  <th className="p-2">Student Name</th>
                  <th className="p-2">CGPA</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Phone</th>
                </tr>
              </thead>
              <tbody>
                {members.slice(0, 4).map((member) => {
                  const profile = profiles?.[member.authUserId];
                  const missing = !profile?.cgpa || !profile?.phone;
                  return (
                    <tr key={member.id} className="border-t">
                      <td className="p-2">
                        {profile?.registrationNumber ?? "—"}
                      </td>
                      <td className="p-2">
                        {getDisplayName(profiles, member.authUserId)}
                        {member.authUserId === team.leaderId && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (Leader)
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {profile?.cgpa != null
                          ? profile.cgpa.toFixed(2)
                          : "—"}
                      </td>
                      <td className="p-2">{profile?.email ?? "—"}</td>
                      <td className="p-2">
                        {profile?.phone ?? "—"}
                        {missing && (
                          <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                            incomplete
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Members with missing CGPA or phone should update their profile.
          </p>
        </div>
      </section>

      {/* ── Section: Sustainable Development Goals ─────────────────── */}
      <section className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sustainable Development Goals (SDGs)
        </h3>
        <p className="text-xs text-muted-foreground">
          Select the UN SDGs your project contributes to.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SUSTAINABLE_DEVELOPMENT_GOALS.map((sdg) => {
            const checked = sdgs.includes(sdg.id);
            return (
              <label
                key={sdg.id}
                className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm transition-colors ${
                  checked ? "border-primary/50 bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checked}
                  onChange={() => toggleSdg(sdg.id)}
                />
                <span>
                  <span className="font-medium">SDG-{sdg.id} —</span> {sdg.title}
                </span>
              </label>
            );
          })}
        </div>
        {errors.sdgs && (
          <p className="text-sm text-destructive">
            {errors.sdgs.message as string}
          </p>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sdgJustification">SDG Justification</Label>
            <WordCount
              count={justificationWords}
              min={SDG_JUSTIFICATION_MIN_WORDS}
              max={SDG_JUSTIFICATION_MAX_WORDS}
            />
          </div>
          <Textarea
            id="sdgJustification"
            rows={4}
            placeholder="Explain how your project aligns with the selected SDGs."
            {...register("sdgJustification")}
          />
          {errors.sdgJustification && (
            <p className="text-sm text-destructive">
              {errors.sdgJustification.message}
            </p>
          )}
        </div>
      </section>

      {/* ── Section: Proposal Content ─────────────────────────────── */}
      <section className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Proposal Content
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="abstract">Abstract (Optional)</Label>
            <WordCount
              count={abstractWords}
              max={ABSTRACT_MAX_WORDS}
            />
          </div>
          <Textarea
            id="abstract"
            rows={10}
            placeholder={`Summarize your project (up to ${ABSTRACT_MAX_WORDS} words).`}
            {...register("abstract")}
          />
          {errors.abstract && (
            <p className="text-sm text-destructive">
              {errors.abstract.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="previousObjectives">
              Previous Project Objectives (Optional)
            </Label>
            <WordCount
              count={objectivesWords}
              max={PREVIOUS_OBJECTIVES_MAX_WORDS}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Only if this project extends previous work.
          </p>
          <Textarea
            id="previousObjectives"
            rows={6}
            placeholder="Objectives of the previous project this work builds upon."
            {...register("previousObjectives")}
          />
          {errors.previousObjectives && (
            <p className="text-sm text-destructive">
              {errors.previousObjectives.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Proposal PDF (Required for submission)</Label>
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handlePdfUpload(file);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={uploadingPdf}
              onClick={() => pdfInputRef.current?.click()}
            >
              {uploadingPdf && <Loader2 className="animate-spin" />}
              <FileText className="h-4 w-4" />
              {pdfUrl ? "Replace PDF" : "Upload PDF"}
            </Button>
            {pdfUrl && (
              <>
                <Button type="button" variant="secondary" size="sm" asChild>
                  <a
                    href={resolveFileUrl(pdfUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View PDF
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPdfUrl(null);
                    setPdfFileName(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
                {pdfFileName && (
                  <span className="text-sm text-muted-foreground">
                    {pdfFileName}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving || uploadingPdf}>
          {isSaving && <Loader2 className="animate-spin" />}
          Save Proposal
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
