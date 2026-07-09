-- Phase 4 & 5: Academic phases, deliverable templates, rubrics, publishing workflow

CREATE TYPE "PhaseStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'FINALIZED';

CREATE TABLE "Phase" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "creditHours" INTEGER NOT NULL,
  "description" TEXT,
  "status" "PhaseStatus" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliverableTemplate" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "phaseId" TEXT NOT NULL,
  "coordinatorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" "DeliverableType" NOT NULL,
  "dueDate" TIMESTAMP(3),
  "totalMarks" INTEGER NOT NULL,
  "isLocked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliverableTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RubricCriterion" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "maxMarks" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliverableTemplateAttachment" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliverableTemplateAttachment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Deliverable"
  ADD COLUMN IF NOT EXISTS "phaseId" TEXT,
  ADD COLUMN IF NOT EXISTS "templateId" TEXT,
  ADD COLUMN IF NOT EXISTS "totalMarks" INTEGER,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

ALTER TABLE "Submission"
  ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);

-- Default phase per workspace for existing deliverables
INSERT INTO "Phase" ("id", "workspaceId", "name", "creditHours", "description", "status", "sortOrder", "updatedAt")
SELECT
  gen_random_uuid()::text,
  w."id",
  'General',
  0,
  'Default phase for migrated deliverables',
  'ACTIVE',
  0,
  CURRENT_TIMESTAMP
FROM "Workspace" w
WHERE NOT EXISTS (
  SELECT 1 FROM "Phase" p WHERE p."workspaceId" = w."id" AND p."name" = 'General'
);

UPDATE "Deliverable" d
SET "phaseId" = p."id"
FROM "Phase" p
WHERE d."phaseId" IS NULL
  AND p."workspaceId" = d."workspaceId"
  AND p."name" = 'General';

ALTER TABLE "Deliverable" ALTER COLUMN "phaseId" SET NOT NULL;

ALTER TABLE "Phase"
  ADD CONSTRAINT "Phase_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliverableTemplate"
  ADD CONSTRAINT "DeliverableTemplate_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliverableTemplate"
  ADD CONSTRAINT "DeliverableTemplate_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RubricCriterion"
  ADD CONSTRAINT "RubricCriterion_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "DeliverableTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliverableTemplateAttachment"
  ADD CONSTRAINT "DeliverableTemplateAttachment_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "DeliverableTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Deliverable"
  ADD CONSTRAINT "Deliverable_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Deliverable"
  ADD CONSTRAINT "Deliverable_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "DeliverableTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "Phase_workspaceId_name_key" ON "Phase"("workspaceId", "name");
CREATE INDEX IF NOT EXISTS "Phase_workspaceId_status_sortOrder_idx" ON "Phase"("workspaceId", "status", "sortOrder");
CREATE INDEX IF NOT EXISTS "DeliverableTemplate_workspaceId_phaseId_idx" ON "DeliverableTemplate"("workspaceId", "phaseId");
CREATE INDEX IF NOT EXISTS "DeliverableTemplate_workspaceId_createdAt_idx" ON "DeliverableTemplate"("workspaceId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "RubricCriterion_templateId_sortOrder_idx" ON "RubricCriterion"("templateId", "sortOrder");
CREATE INDEX IF NOT EXISTS "DeliverableTemplateAttachment_templateId_idx" ON "DeliverableTemplateAttachment"("templateId");
CREATE INDEX IF NOT EXISTS "Deliverable_phaseId_dueDate_idx" ON "Deliverable"("phaseId", "dueDate");
CREATE INDEX IF NOT EXISTS "Deliverable_templateId_idx" ON "Deliverable"("templateId");
CREATE UNIQUE INDEX IF NOT EXISTS "Deliverable_templateId_teamId_key" ON "Deliverable"("templateId", "teamId");
