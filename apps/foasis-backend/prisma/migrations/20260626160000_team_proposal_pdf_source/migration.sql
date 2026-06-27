-- Team is the authoritative store for proposal PDF
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "proposalPdfUrl" TEXT;

UPDATE "Team" AS t
SET "proposalPdfUrl" = p."proposalPdfUrl"
FROM "Proposal" AS p
WHERE p."teamId" = t.id
  AND t."proposalPdfUrl" IS NULL
  AND p."proposalPdfUrl" IS NOT NULL;
