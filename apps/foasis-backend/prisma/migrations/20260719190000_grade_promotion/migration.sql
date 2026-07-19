-- Grade Improvement Policy (+1 Mark Rule): audit + base percentage tracking

-- AlterTable StudentPhaseResult
ALTER TABLE "StudentPhaseResult" ADD COLUMN IF NOT EXISTS "basePercentage" DOUBLE PRECISION;
ALTER TABLE "StudentPhaseResult" ADD COLUMN IF NOT EXISTS "promotionApplied" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudentPhaseResult" ADD COLUMN IF NOT EXISTS "promotedById" TEXT;
ALTER TABLE "StudentPhaseResult" ADD COLUMN IF NOT EXISTS "promotedAt" TIMESTAMP(3);

-- Backfill basePercentage for existing rows (no promotion applied yet).
UPDATE "StudentPhaseResult"
SET "basePercentage" = "weightedMarks"
WHERE "basePercentage" IS NULL;
