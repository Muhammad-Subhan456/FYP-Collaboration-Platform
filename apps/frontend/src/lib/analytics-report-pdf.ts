import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { sdgLabel } from "@/constants/proposal";
import type { CoordinatorAnalyticsData } from "@/services/coordinator-page.service";

const MARGIN = 16;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const COLORS = {
  primary: [15, 118, 110] as [number, number, number],
  secondary: [3, 105, 161] as [number, number, number],
  accent: [67, 56, 202] as [number, number, number],
  amber: [180, 83, 9] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
};

const PROPOSAL_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_SUPERVISOR: "Awaiting supervisor",
  SUPERVISOR_ASSIGNED: "With supervisor",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IGNORED: "Ignored",
};

const SUBMISSION_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  CHANGES_REQUIRED: "Changes required",
  APPROVED: "Approved",
  FINALIZED: "Finalized",
};

const EVALUATION_LABELS: Record<string, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
};

const PHASE_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  PUBLISHED: "Published",
};

export type AnalyticsReportFilters = {
  /** Human-readable filter labels; empty means full workspace. */
  applied?: string[];
};

type DocWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

function sumRecord(record: Record<string, number> | undefined): number {
  return Object.values(record ?? {}).reduce((sum, value) => sum + value, 0);
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

function formatDateTime(date = new Date()): string {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 18) {
    doc.addPage();
    return MARGIN + 4;
  }
  return y;
}

function sectionHeading(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.primary);
  doc.text(title, MARGIN, y);
  y += 2;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
  return y + 8;
}

function bodyText(doc: jsPDF, text: string, y: number, options?: { muted?: boolean }): number {
  y = ensureSpace(doc, y, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...(options?.muted ? COLORS.muted : COLORS.text));
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 5 + 2;
}

function drawHorizontalBars(
  doc: jsPDF,
  y: number,
  rows: Array<{ label: string; value: number }>,
  color: [number, number, number],
): number {
  if (rows.length === 0) {
    return bodyText(doc, "No data available for this chart.", y, { muted: true });
  }

  const max = Math.max(...rows.map((row) => row.value), 1);
  const barMaxWidth = CONTENT_WIDTH - 78;
  const rowHeight = 8;

  y = ensureSpace(doc, y, rows.length * rowHeight + 6);

  for (const row of rows) {
    y = ensureSpace(doc, y, rowHeight);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    const label = row.label.length > 28 ? `${row.label.slice(0, 27)}…` : row.label;
    doc.text(label, MARGIN, y + 3.5);

    const barWidth = (row.value / max) * barMaxWidth;
    doc.setFillColor(...color);
    doc.roundedRect(MARGIN + 58, y, Math.max(barWidth, 0.8), 4.5, 0.8, 0.8, "F");

    doc.setTextColor(...COLORS.muted);
    doc.text(String(row.value), MARGIN + 60 + barWidth + 2, y + 3.5);
    y += rowHeight;
  }

  return y + 4;
}

function drawSimplePieLegend(
  doc: jsPDF,
  y: number,
  rows: Array<{ label: string; value: number }>,
): number {
  // Prefer labeled bars over pie wedges — more readable in print/PDF.
  return drawHorizontalBars(doc, y, rows, COLORS.secondary);
}

function statusTable(
  doc: DocWithAutoTable,
  y: number,
  title: string,
  record: Record<string, number>,
  labels: Record<string, string>,
): number {
  y = sectionHeading(doc, title, y);
  const total = sumRecord(record);
  const body = Object.entries(labels).map(([key, label]) => {
    const count = record[key] ?? 0;
    return [label, String(count), pct(count, total)];
  });

  if (total === 0) {
    return bodyText(doc, "No data available.", y, { muted: true });
  }

  autoTable(doc, {
    startY: y,
    head: [["Status", "Count", "Share"]],
    body,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 2.2 },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  return (doc.lastAutoTable?.finalY ?? y) + 8;
}

function addFooters(doc: jsPDF, workspaceName: string) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, pageHeight - 12, PAGE_WIDTH - MARGIN, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`FOASIS · ${workspaceName}`, MARGIN, pageHeight - 7);
    doc.text(`Page ${page} of ${pageCount}`, PAGE_WIDTH - MARGIN, pageHeight - 7, {
      align: "right",
    });
  }
}

function buildFindings(data: CoordinatorAnalyticsData): string[] {
  const findings: string[] = [];
  const insights = data.proposalInsights;
  const proposalTotal = sumRecord(data.proposalsByStatus);
  const approved = data.proposalsByStatus?.APPROVED ?? 0;
  const awaiting = data.proposalsByStatus?.PENDING_SUPERVISOR ?? 0;
  const withSupervisor =
    (data.proposalsByStatus?.SUPERVISOR_ASSIGNED ?? 0) + approved;

  findings.push(
    `This workspace currently has ${data.summary?.totalTeams ?? 0} FYP team(s) and ${proposalTotal} proposal(s).`,
  );

  if (insights) {
    if (insights.domains.mostPopular) {
      findings.push(
        `The most common project domain is “${insights.domains.mostPopular}” (${insights.domains.perDomain[0]?.count ?? 0} selection(s)).`,
      );
    } else {
      findings.push("No project domain selections have been recorded yet.");
    }

    if (insights.sdgs.mostSelected) {
      findings.push(
        `The most addressed SDG is ${sdgLabel(insights.sdgs.mostSelected)} (${insights.sdgs.perSdg[0]?.count ?? 0} selection(s)).`,
      );
    } else {
      findings.push("No SDG selections have been recorded yet.");
    }

    findings.push(
      `${insights.domains.multiDomainProjects} project(s) span multiple domains; average domains per project with domain data is ${insights.domains.avgDomainsPerProject}.`,
    );
    findings.push(
      `${insights.sdgs.projectsWithSdgs} proposal(s) include SDG alignment; average SDGs per such project is ${insights.sdgs.avgSdgsPerProject}.`,
    );
  }

  if (proposalTotal > 0) {
    findings.push(
      `${withSupervisor} proposal(s) are with or approved by a supervisor (${pct(withSupervisor, proposalTotal)}); ${awaiting} await supervisor action (${pct(awaiting, proposalTotal)}).`,
    );
  }

  findings.push(
    `Program progress: ${data.summary?.activePhases ?? 0} active phase(s), ${data.summary?.activeDeliverables ?? 0} active deliverable(s), ${data.summary?.finalizedSubmissions ?? 0} finalized submission(s), and ${data.summary?.pendingEvaluations ?? 0} pending evaluation(s).`,
  );

  return findings;
}

/**
 * Builds a professional FOASIS Analytics PDF from the same payload used by the Analytics UI.
 */
export function buildAnalyticsReportPdf(
  data: CoordinatorAnalyticsData,
  options?: AnalyticsReportFilters,
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as DocWithAutoTable;
  const workspaceName = data.workspace?.name?.trim() || "Workspace";
  const generatedAt = formatDateTime();
  const filters =
    options?.applied && options.applied.length > 0
      ? options.applied
      : ["None — full workspace dataset"];

  const insights = data.proposalInsights;
  const proposalTotal = insights?.totalProposals ?? sumRecord(data.proposalsByStatus);
  const domainBase = Math.max(insights?.domains.projectsWithDomains ?? 0, 1);
  const sdgSelectionTotal = (insights?.sdgs.perSdg ?? []).reduce(
    (sum, row) => sum + row.count,
    0,
  );

  // —— Cover / title ——
  let y = MARGIN + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.primary);
  doc.text("FOASIS Analytics Report", MARGIN, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);
  doc.text("Final Year Project program analysis", MARGIN, y);
  y += 10;

  y = sectionHeading(doc, "1. Report Information", y);
  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: [
      ["Workspace", workspaceName],
      ["Generated", generatedAt],
      ["Applied filters", filters.join("; ")],
      ["Source", "Coordinator Analytics (workspace-scoped)"],
    ],
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 2.4 },
    headStyles: { fillColor: COLORS.primary, textColor: 255 },
    columnStyles: { 0: { cellWidth: 42, fontStyle: "bold" } },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 10;

  // —— Executive overview ——
  y = sectionHeading(doc, "2. Executive Overview", y);
  const summary = data.summary ?? {
    totalTeams: 0,
    activePhases: 0,
    deliverableTemplates: 0,
    lockedTemplates: 0,
    activeDeliverables: 0,
    pendingEvaluations: 0,
    finalizedSubmissions: 0,
    publishedPhaseResults: 0,
  };
  const users = data.users ?? {};

  autoTable(doc, {
    startY: y,
    head: [["Key metric", "Value"]],
    body: [
      ["FYP teams", String(summary.totalTeams)],
      ["Total proposals", String(proposalTotal)],
      ["Active phases", String(summary.activePhases)],
      ["Active deliverables", String(summary.activeDeliverables)],
      ["Finalized submissions", String(summary.finalizedSubmissions)],
      ["Pending evaluations", String(summary.pendingEvaluations)],
      ["Published phase result rows", String(summary.publishedPhaseResults)],
      ["Students", String(users.totalStudents ?? 0)],
      ["Supervisors", String(users.totalSupervisors ?? 0)],
      ["Evaluators", String(users.totalEvaluators ?? 0)],
    ],
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 2.2 },
    headStyles: { fillColor: COLORS.secondary, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 10;

  // —— Proposal statistics ——
  y = statusTable(
    doc,
    y,
    "3. Proposal / Project Status Analysis",
    data.proposalsByStatus ?? {},
    PROPOSAL_LABELS,
  );

  y = ensureSpace(doc, y, 70);
  y = bodyText(doc, "Proposal status distribution", y);
  y = drawSimplePieLegend(
    doc,
    y,
    Object.entries(PROPOSAL_LABELS)
      .map(([key, label]) => ({
        label,
        value: data.proposalsByStatus?.[key] ?? 0,
      }))
      .filter((row) => row.value > 0),
  );

  // —— Domain analysis ——
  y = sectionHeading(doc, "4. Project Domain Analysis", y);
  if (!insights || insights.domains.perDomain.length === 0) {
    y = bodyText(doc, "No domain data available.", y, { muted: true });
  } else {
    y = bodyText(
      doc,
      `Projects with domain data: ${insights.domains.projectsWithDomains}. Other (custom) domain specified: ${insights.domains.otherCount}. Single-domain: ${insights.domains.singleDomainProjects}. Multi-domain: ${insights.domains.multiDomainProjects}. Average domains per project: ${insights.domains.avgDomainsPerProject}. Most popular: ${insights.domains.mostPopular ?? "—"}.`,
      y,
    );
    y = bodyText(doc, "Projects per domain (selection counts)", y);
    y = drawHorizontalBars(
      doc,
      y,
      insights.domains.perDomain.slice(0, 12).map((row) => ({
        label: row.domain,
        value: row.count,
      })),
      COLORS.primary,
    );

    autoTable(doc, {
      startY: y,
      head: [["Domain", "Selections", "% of projects with domains*"]],
      body: insights.domains.perDomain.map((row) => [
        row.domain,
        String(row.count),
        pct(row.count, domainBase),
      ]),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLORS.primary, textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 3;
    y = bodyText(
      doc,
      "*Percentage uses projects with at least one domain as the denominator. Multi-domain projects contribute to multiple domain rows.",
      y,
      { muted: true },
    );
  }

  // —— SDG analysis ——
  y = sectionHeading(doc, "5. SDG Analysis", y);
  if (!insights || insights.sdgs.perSdg.length === 0) {
    y = bodyText(doc, "No SDG data available.", y, { muted: true });
  } else {
    y = bodyText(
      doc,
      `Proposals with SDGs: ${insights.sdgs.projectsWithSdgs}. Average SDGs per such project: ${insights.sdgs.avgSdgsPerProject}. Most selected: ${insights.sdgs.mostSelected ? sdgLabel(insights.sdgs.mostSelected) : "—"}.`,
      y,
    );
    y = bodyText(doc, "SDG distribution (selection counts)", y);
    y = drawHorizontalBars(
      doc,
      y,
      [...insights.sdgs.perSdg]
        .sort((a, b) => a.sdg - b.sdg)
        .map((row) => ({
          label: `SDG ${row.sdg}`,
          value: row.count,
        })),
      COLORS.secondary,
    );

    autoTable(doc, {
      startY: y,
      head: [["SDG", "Title", "Selections", "% of SDG selections"]],
      body: insights.sdgs.perSdg.map((row) => [
        `SDG ${row.sdg}`,
        sdgLabel(row.sdg).replace(/^SDG-\d+\s—\s/, ""),
        String(row.count),
        pct(row.count, Math.max(sdgSelectionTotal, 1)),
      ]),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLORS.secondary, textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  // —— Cross analysis ——
  y = sectionHeading(doc, "6. Domain × SDG Insights", y);
  if (!insights || insights.crossAnalysis.length === 0) {
    y = bodyText(doc, "No cross-analysis data available.", y, { muted: true });
  } else {
    y = bodyText(
      doc,
      "Most common combinations of project domain and Sustainable Development Goal.",
      y,
    );
    autoTable(doc, {
      startY: y,
      head: [["Domain", "SDG", "Count"]],
      body: insights.crossAnalysis.map((row) => [
        row.domain,
        sdgLabel(row.sdg),
        String(row.count),
      ]),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLORS.accent, textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  // —— Program workflow ——
  y = statusTable(
    doc,
    y,
    "7. Submission Workflow",
    data.submissionsByStatus ?? {},
    SUBMISSION_LABELS,
  );
  y = statusTable(
    doc,
    y,
    "8. Evaluation Assignments",
    data.evaluationsByStatus ?? {},
    EVALUATION_LABELS,
  );
  y = statusTable(doc, y, "9. Phase Configuration", data.phasesByStatus ?? {}, PHASE_LABELS);

  y = sectionHeading(doc, "10. Deliverable Templates & Membership", y);
  const templates = data.templates ?? { total: 0, locked: 0, unlocked: 0 };
  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Templates total", String(templates.total)],
      ["Available (unlocked)", String(templates.unlocked)],
      ["Locked / published", String(templates.locked)],
      ["Students", String(users.totalStudents ?? 0)],
      ["Supervisors", String(users.totalSupervisors ?? 0)],
      ["Coordinators", String(users.totalCoordinators ?? 0)],
      ["Evaluators", String(users.totalEvaluators ?? 0)],
    ],
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 2.2 },
    headStyles: { fillColor: COLORS.amber, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 10;

  // —— Summary of findings ——
  y = sectionHeading(doc, "11. Summary of Findings", y);
  for (const finding of buildFindings(data)) {
    y = ensureSpace(doc, y, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    const bullet = doc.splitTextToSize(`• ${finding}`, CONTENT_WIDTH);
    doc.text(bullet, MARGIN, y);
    y += bullet.length * 5 + 2;
  }

  y = ensureSpace(doc, y, 16);
  y = bodyText(
    doc,
    "All figures in this report are derived from the same Coordinator Analytics calculations shown in the FOASIS Analytics tab for the current workspace.",
    y,
    { muted: true },
  );

  addFooters(doc, workspaceName);
  return doc;
}

export function downloadAnalyticsReportPdf(
  data: CoordinatorAnalyticsData,
  options?: AnalyticsReportFilters,
) {
  const doc = buildAnalyticsReportPdf(data, options);
  const workspaceSlug = (data.workspace?.name ?? "workspace")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`foasis-analytics-report-${workspaceSlug || "workspace"}-${stamp}.pdf`);
}
