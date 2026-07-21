-- Project Proposal Module Redesign (University Template) — Phase 1: data model

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ProjectNature" AS ENUM ('DEVELOPMENT', 'RESEARCH_AND_DEVELOPMENT', 'HYBRID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable UserProfile: student CGPA + phone
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "cgpa" DOUBLE PRECISION;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- AlterTable Team: university proposal fields
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "domains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "otherDomain" TEXT;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "nature" "ProjectNature";
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "sdgs" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "sdgJustification" TEXT;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "previousObjectives" TEXT;

-- AlterTable Proposal: snapshot of university proposal fields + human-readable code
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "projectCode" TEXT;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "domains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "otherDomain" TEXT;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "nature" "ProjectNature";
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "sdgs" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "sdgJustification" TEXT;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "previousObjectives" TEXT;

-- Unique index for the human-readable project code
CREATE UNIQUE INDEX IF NOT EXISTS "Proposal_projectCode_key" ON "Proposal"("projectCode");
