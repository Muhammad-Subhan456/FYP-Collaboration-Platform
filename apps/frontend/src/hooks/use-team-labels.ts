import type { Proposal } from "@/types/student";

export function getTeamLabel(
  proposals: Proposal[] | undefined,
  teamId: string,
) {
  return (
    proposals?.find((proposal) => proposal.teamId === teamId)?.title ??
    "Unknown Team"
  );
}
