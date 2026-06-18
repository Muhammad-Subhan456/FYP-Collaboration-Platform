export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const proposalStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_SUPERVISOR: "Awaiting supervisor",
  SUPERVISOR_ASSIGNED: "Ready for review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function formatProposalStatus(status?: string | null) {
  if (!status) return "—";
  return proposalStatusLabels[status] ?? status.replace(/_/g, " ");
}

export function pluralize(
  count: number,
  singular: string,
  plural?: string,
) {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word}`;
}
