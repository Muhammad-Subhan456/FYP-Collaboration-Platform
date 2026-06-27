-- Allow supervisor invitations before a team has a proposal
ALTER TABLE "SupervisorInvitation" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
ALTER TABLE "SupervisorInvitation" ALTER COLUMN "proposalId" DROP NOT NULL;

DROP INDEX IF EXISTS "SupervisorInvitation_proposalId_supervisorId_key";

CREATE INDEX IF NOT EXISTS "SupervisorInvitation_proposalId_supervisorId_idx"
  ON "SupervisorInvitation"("proposalId", "supervisorId");
CREATE INDEX IF NOT EXISTS "SupervisorInvitation_teamId_supervisorId_idx"
  ON "SupervisorInvitation"("teamId", "supervisorId");

CREATE UNIQUE INDEX IF NOT EXISTS "SupervisorInvitation_proposal_supervisor_unique"
  ON "SupervisorInvitation"("proposalId", "supervisorId")
  WHERE "proposalId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SupervisorInvitation_team_supervisor_unique"
  ON "SupervisorInvitation"("teamId", "supervisorId")
  WHERE "teamId" IS NOT NULL;
