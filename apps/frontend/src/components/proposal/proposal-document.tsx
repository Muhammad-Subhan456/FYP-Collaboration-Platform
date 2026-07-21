"use client";

import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDate } from "@/lib/format";
import { formatProjectNature, sdgLabel } from "@/constants/proposal";
import type { ProposalDocument as ProposalDocumentData } from "@/types/proposal";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function resolveFileUrl(url: string) {
  return url.startsWith("http") ? url : `${apiBase}${url}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}

export function ProposalDocument({ data }: { data: ProposalDocumentData }) {
  const { proposal, team, members, supervisorName } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              FYDP Project Proposal
            </p>
            <h2 className="text-xl font-semibold leading-tight">
              {proposal.title}
            </h2>
          </div>
          <StatusBadge status={proposal.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {proposal.projectCode && (
            <span className="rounded-md bg-muted px-2 py-1 font-medium">
              Project ID: {proposal.projectCode}{" "}
              <span className="italic">(For Office Use Only)</span>
            </span>
          )}
          <span>Team: {team.name}</span>
          <span>Submitted {formatDate(proposal.createdAt)}</span>
        </div>
      </div>

      {/* Registration */}
      <Section title="Project Registration">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nature of Project"
            value={formatProjectNature(proposal.nature)}
          />
          <Field label="Team Name" value={team.name} />
        </div>
        <Field
          label="Area of Specialization / Project Domain"
          value={
            proposal.domains.length > 0 || proposal.otherDomain ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {proposal.domains.map((domain) => (
                  <Badge key={domain} variant="secondary">
                    {domain}
                  </Badge>
                ))}
                {proposal.otherDomain && (
                  <Badge variant="outline">{proposal.otherDomain}</Badge>
                )}
              </div>
            ) : (
              "—"
            )
          }
        />
      </Section>

      <Separator />

      {/* Members */}
      <Section title="Project Group Members">
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
              {members.map((member) => (
                <tr key={member.authUserId} className="border-t">
                  <td className="p-2">{member.registrationNumber ?? "—"}</td>
                  <td className="p-2">
                    {member.fullName ?? "—"}
                    {member.isLeader && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (Leader)
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    {member.cgpa != null ? member.cgpa.toFixed(2) : "—"}
                  </td>
                  <td className="p-2">{member.email ?? "—"}</td>
                  <td className="p-2">{member.phone ?? "—"}</td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td className="p-2 text-muted-foreground" colSpan={5}>
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Separator />

      {/* SDGs */}
      <Section title="Sustainable Development Goals">
        {proposal.sdgs.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {proposal.sdgs.map((sdg) => (
              <Badge key={sdg} variant="outline">
                {sdgLabel(sdg)}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No SDGs selected.
          </p>
        )}
        {proposal.sdgJustification && (
          <Field
            label="Justification"
            value={
              <p className="mt-1 whitespace-pre-line text-muted-foreground">
                {proposal.sdgJustification}
              </p>
            }
          />
        )}
      </Section>

      <Separator />

      {/* Content */}
      <Section title="Abstract">
        <p className="whitespace-pre-line text-sm text-muted-foreground">
          {proposal.abstract}
        </p>
      </Section>

      {proposal.previousObjectives && (
        <Section title="Previous Project Objectives">
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {proposal.previousObjectives}
          </p>
        </Section>
      )}

      {proposal.proposalPdfUrl && (
        <Section title="Attachment">
          <Button variant="outline" size="sm" asChild>
            <a
              href={resolveFileUrl(proposal.proposalPdfUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              View Proposal PDF
            </a>
          </Button>
        </Section>
      )}

      {/* Review / Supervisor */}
      {(supervisorName || proposal.reviewFeedback) && (
        <>
          <Separator />
          <Section title="Supervision">
            {supervisorName && (
              <Field label="Assigned Supervisor" value={supervisorName} />
            )}
            {proposal.reviewFeedback && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Supervisor feedback
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {proposal.reviewFeedback}
                </p>
              </div>
            )}
            {proposal.reviewedAt && (
              <p className="text-xs text-muted-foreground">
                Reviewed {formatDate(proposal.reviewedAt)}
              </p>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
