-- Phase 6: Deliverable-based evaluation, weightage, and GPA

-- AlterEnum
ALTER TYPE "PhaseStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';

-- CreateEnum
CREATE TYPE "SubmissionEvaluationStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED');

-- AlterTable Phase
ALTER TABLE "Phase" ADD COLUMN IF NOT EXISTS "isConfigurationPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Phase" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

-- AlterTable DeliverableTemplate
ALTER TABLE "DeliverableTemplate" ADD COLUMN IF NOT EXISTS "weightagePercent" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- CreateTable SubmissionEvaluation
CREATE TABLE "SubmissionEvaluation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "status" "SubmissionEvaluationStatus" NOT NULL DEFAULT 'ASSIGNED',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable StudentSubmissionEvaluation
CREATE TABLE "StudentSubmissionEvaluation" (
    "id" TEXT NOT NULL,
    "submissionEvaluationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "totalMarks" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSubmissionEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable SubmissionCriterionScore
CREATE TABLE "SubmissionCriterionScore" (
    "id" TEXT NOT NULL,
    "studentSubmissionEvaluationId" TEXT NOT NULL,
    "rubricCriterionId" TEXT NOT NULL,
    "marksAwarded" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SubmissionCriterionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable StudentPhaseResult
CREATE TABLE "StudentPhaseResult" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weightedMarks" DOUBLE PRECISION NOT NULL,
    "gpa" DOUBLE PRECISION NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "breakdown" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPhaseResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionEvaluation_submissionId_evaluatorId_key" ON "SubmissionEvaluation"("submissionId", "evaluatorId");
CREATE INDEX "SubmissionEvaluation_workspaceId_evaluatorId_status_idx" ON "SubmissionEvaluation"("workspaceId", "evaluatorId", "status");
CREATE INDEX "SubmissionEvaluation_workspaceId_teamId_idx" ON "SubmissionEvaluation"("workspaceId", "teamId");
CREATE INDEX "SubmissionEvaluation_deliverableId_status_idx" ON "SubmissionEvaluation"("deliverableId", "status");
CREATE INDEX "SubmissionEvaluation_templateId_teamId_idx" ON "SubmissionEvaluation"("templateId", "teamId");

CREATE UNIQUE INDEX "StudentSubmissionEvaluation_submissionEvaluationId_studentId_key" ON "StudentSubmissionEvaluation"("submissionEvaluationId", "studentId");
CREATE INDEX "StudentSubmissionEvaluation_studentId_idx" ON "StudentSubmissionEvaluation"("studentId");

CREATE UNIQUE INDEX "SubmissionCriterionScore_studentSubmissionEvaluationId_rubricCriterionId_key" ON "SubmissionCriterionScore"("studentSubmissionEvaluationId", "rubricCriterionId");

CREATE UNIQUE INDEX "StudentPhaseResult_phaseId_studentId_key" ON "StudentPhaseResult"("phaseId", "studentId");
CREATE INDEX "StudentPhaseResult_workspaceId_studentId_idx" ON "StudentPhaseResult"("workspaceId", "studentId");
CREATE INDEX "StudentPhaseResult_phaseId_isComplete_idx" ON "StudentPhaseResult"("phaseId", "isComplete");

-- AddForeignKey
ALTER TABLE "SubmissionEvaluation" ADD CONSTRAINT "SubmissionEvaluation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionEvaluation" ADD CONSTRAINT "SubmissionEvaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionEvaluation" ADD CONSTRAINT "SubmissionEvaluation_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionEvaluation" ADD CONSTRAINT "SubmissionEvaluation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DeliverableTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentSubmissionEvaluation" ADD CONSTRAINT "StudentSubmissionEvaluation_submissionEvaluationId_fkey" FOREIGN KEY ("submissionEvaluationId") REFERENCES "SubmissionEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionCriterionScore" ADD CONSTRAINT "SubmissionCriterionScore_studentSubmissionEvaluationId_fkey" FOREIGN KEY ("studentSubmissionEvaluationId") REFERENCES "StudentSubmissionEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionCriterionScore" ADD CONSTRAINT "SubmissionCriterionScore_rubricCriterionId_fkey" FOREIGN KEY ("rubricCriterionId") REFERENCES "RubricCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentPhaseResult" ADD CONSTRAINT "StudentPhaseResult_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentPhaseResult" ADD CONSTRAINT "StudentPhaseResult_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Auto-create EVALUATOR memberships for existing supervisors
INSERT INTO "WorkspaceMembership" ("id", "workspaceId", "userId", "role", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  wm."workspaceId",
  wm."userId",
  'EVALUATOR'::"UserRole",
  true,
  NOW(),
  NOW()
FROM "WorkspaceMembership" wm
WHERE wm."role" = 'SUPERVISOR'
  AND wm."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM "WorkspaceMembership" existing
    WHERE existing."workspaceId" = wm."workspaceId"
      AND existing."userId" = wm."userId"
      AND existing."role" = 'EVALUATOR'
  );
