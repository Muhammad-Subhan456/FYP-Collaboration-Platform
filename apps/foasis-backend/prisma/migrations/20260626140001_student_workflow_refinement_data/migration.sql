-- Team: replace description with optional project fields
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "projectTitle" TEXT;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "projectAbstract" TEXT;
ALTER TABLE "Team" DROP COLUMN IF EXISTS "description";

-- Proposal: PDF document URL
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "proposalPdfUrl" TEXT;

-- Supervisor request workflow fields
ALTER TABLE "SupervisorRequest" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "SupervisorRequest" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "SupervisorRequest" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);

UPDATE "SupervisorRequest" SET "status" = 'IGNORED' WHERE "status" = 'CANCELLED';
UPDATE "SupervisorInvitation" SET "status" = 'IGNORED' WHERE "status" = 'CANCELLED';

DROP INDEX IF EXISTS "SupervisorRequest_proposalId_supervisorId_key";

CREATE INDEX IF NOT EXISTS "SupervisorRequest_proposalId_status_idx"
  ON "SupervisorRequest"("proposalId", "status");
CREATE INDEX IF NOT EXISTS "SupervisorRequest_status_expiresAt_idx"
  ON "SupervisorRequest"("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "SupervisorRequest_proposalId_supervisorId_idx"
  ON "SupervisorRequest"("proposalId", "supervisorId");
