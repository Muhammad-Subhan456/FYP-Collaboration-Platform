-- Proposal Workflow V2: single point of acceptance

ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "pendingSupervisorId" TEXT;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "pendingExpiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Proposal_pendingSupervisorId_status_idx"
  ON "Proposal"("pendingSupervisorId", "status");

-- Add IGNORED to ProposalStatus
ALTER TYPE "ProposalStatus" ADD VALUE IF NOT EXISTS 'IGNORED';

-- Backfill pending supervisor from active supervisor requests
UPDATE "Proposal" AS p
SET
  "pendingSupervisorId" = sr."supervisorId",
  "pendingExpiresAt" = sr."expiresAt"
FROM "SupervisorRequest" AS sr
WHERE sr."proposalId" = p.id
  AND sr.status = 'PENDING'
  AND p.status = 'PENDING_SUPERVISOR'
  AND p."pendingSupervisorId" IS NULL;
