-- Multiple attachments per deliverable submission
CREATE TABLE IF NOT EXISTS "SubmissionAttachment" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SubmissionAttachment_workspaceId_createdAt_idx"
  ON "SubmissionAttachment"("workspaceId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SubmissionAttachment_submissionId_createdAt_idx"
  ON "SubmissionAttachment"("submissionId", "createdAt");

ALTER TABLE "SubmissionAttachment"
  ADD CONSTRAINT "SubmissionAttachment_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionAttachment"
  ADD CONSTRAINT "SubmissionAttachment_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill primary file as first attachment for existing submissions
INSERT INTO "SubmissionAttachment" ("id", "workspaceId", "submissionId", "fileUrl", "fileName", "createdAt")
SELECT
  gen_random_uuid()::text,
  s."workspaceId",
  s."id",
  s."fileUrl",
  COALESCE(NULLIF(split_part(s."fileUrl", '/', -1), ''), 'submission-file'),
  s."submittedAt"
FROM "Submission" s
WHERE NOT EXISTS (
  SELECT 1 FROM "SubmissionAttachment" a WHERE a."submissionId" = s."id"
);
