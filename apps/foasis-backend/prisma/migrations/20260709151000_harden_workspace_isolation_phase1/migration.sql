-- Harden workspace isolation (Phase 1): add workspaceId columns to tenant data
-- and backfill from existing relationships.
--
-- NOTE:
-- - For records that do not have a teamId/proposalId to infer workspaceId,
--   we backfill from the user's first workspace membership if possible,
--   otherwise DEFAULT_WORKSPACE_ID.

-- 1) Fix TeamMember uniqueness (was global authUserId unique)
ALTER TABLE "TeamMember" DROP CONSTRAINT IF EXISTS "TeamMember_authUserId_key";

-- 2) Add workspaceId columns (nullable for backfill, then set NOT NULL)
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "SupervisorRequest" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "SupervisorInvitation" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "WorkStreamComment" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "WorkStreamAttachment" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "TeamIssue" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "TeamIssueComment" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "TeamIssueActivity" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- 3) Backfill from strong relationships
-- Proposal -> Team.workspaceId
UPDATE "Proposal" p
SET "workspaceId" = t."workspaceId"
FROM "Team" t
WHERE p."teamId" = t."id" AND p."workspaceId" IS NULL;

-- SupervisorRequest -> Proposal.workspaceId
UPDATE "SupervisorRequest" sr
SET "workspaceId" = p."workspaceId"
FROM "Proposal" p
WHERE sr."proposalId" = p."id" AND sr."workspaceId" IS NULL;

-- SupervisorInvitation: prefer Team.workspaceId; else Proposal.workspaceId
UPDATE "SupervisorInvitation" si
SET "workspaceId" = t."workspaceId"
FROM "Team" t
WHERE si."teamId" = t."id" AND si."workspaceId" IS NULL;

UPDATE "SupervisorInvitation" si
SET "workspaceId" = p."workspaceId"
FROM "Proposal" p
WHERE si."proposalId" = p."id" AND si."workspaceId" IS NULL;

-- WorkStream* -> Team.workspaceId
UPDATE "WorkStreamComment" c
SET "workspaceId" = t."workspaceId"
FROM "Team" t
WHERE c."teamId" = t."id" AND c."workspaceId" IS NULL;

UPDATE "WorkStreamAttachment" a
SET "workspaceId" = t."workspaceId"
FROM "Team" t
WHERE a."teamId" = t."id" AND a."workspaceId" IS NULL;

-- TeamIssue* -> Team.workspaceId (via TeamIssue.teamId)
UPDATE "TeamIssue" i
SET "workspaceId" = t."workspaceId"
FROM "Team" t
WHERE i."teamId" = t."id" AND i."workspaceId" IS NULL;

UPDATE "TeamIssueComment" ic
SET "workspaceId" = i."workspaceId"
FROM "TeamIssue" i
WHERE ic."issueId" = i."id" AND ic."workspaceId" IS NULL;

UPDATE "TeamIssueActivity" ia
SET "workspaceId" = i."workspaceId"
FROM "TeamIssue" i
WHERE ia."issueId" = i."id" AND ia."workspaceId" IS NULL;

-- Deliverable -> Team.workspaceId when teamId exists
UPDATE "Deliverable" d
SET "workspaceId" = t."workspaceId"
FROM "Team" t
WHERE d."teamId" = t."id" AND d."workspaceId" IS NULL;

-- Submission -> Deliverable.workspaceId
UPDATE "Submission" s
SET "workspaceId" = d."workspaceId"
FROM "Deliverable" d
WHERE s."deliverableId" = d."id" AND s."workspaceId" IS NULL;

-- Submission -> Team.workspaceId (direct teamId when deliverable backfill missed)
UPDATE "Submission" s
SET "workspaceId" = t."workspaceId"
FROM "Team" t
WHERE s."teamId" = t."id" AND s."workspaceId" IS NULL;

-- Announcement -> Team.workspaceId when teamId exists
UPDATE "Announcement" a
SET "workspaceId" = t."workspaceId"
FROM "Team" t
WHERE a."teamId" = t."id" AND a."workspaceId" IS NULL;

-- 4) Backfill ambiguous records (no team/proposal)
-- Choose first active membership for the user, else default workspace.
-- (This preserves existing data while enforcing a tenant boundary.)
UPDATE "Announcement" a
SET "workspaceId" = COALESCE(
  (
    SELECT wm."workspaceId"
    FROM "WorkspaceMembership" wm
    WHERE wm."userId" = a."supervisorId" AND wm."isActive" = true
    ORDER BY wm."createdAt" ASC
    LIMIT 1
  ),
  '00000000-0000-0000-0000-000000000001'
)
WHERE a."workspaceId" IS NULL;

UPDATE "Deliverable" d
SET "workspaceId" = COALESCE(
  (
    SELECT wm."workspaceId"
    FROM "WorkspaceMembership" wm
    WHERE wm."userId" = d."supervisorId" AND wm."isActive" = true
    ORDER BY wm."createdAt" ASC
    LIMIT 1
  ),
  '00000000-0000-0000-0000-000000000001'
)
WHERE d."workspaceId" IS NULL;

UPDATE "Notification" n
SET "workspaceId" = COALESCE(
  (
    SELECT wm."workspaceId"
    FROM "WorkspaceMembership" wm
    WHERE wm."userId" = n."authUserId" AND wm."isActive" = true
    ORDER BY wm."createdAt" ASC
    LIMIT 1
  ),
  '00000000-0000-0000-0000-000000000001'
)
WHERE n."workspaceId" IS NULL;

UPDATE "ActivityLog" al
SET "workspaceId" = COALESCE(
  (
    SELECT wm."workspaceId"
    FROM "WorkspaceMembership" wm
    WHERE wm."userId" = al."authUserId" AND wm."isActive" = true
    ORDER BY wm."createdAt" ASC
    LIMIT 1
  ),
  '00000000-0000-0000-0000-000000000001'
)
WHERE al."workspaceId" IS NULL;

-- 4b) Final safety fallback — assign default workspace to any remaining orphans
UPDATE "Proposal" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "SupervisorRequest" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "SupervisorInvitation" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "Notification" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "Announcement" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "Deliverable" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "Submission" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "WorkStreamComment" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "WorkStreamAttachment" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "TeamIssue" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "TeamIssueComment" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "TeamIssueActivity" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
UPDATE "ActivityLog" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;

-- 5) Enforce NOT NULL now that we backfilled
ALTER TABLE "Proposal" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "SupervisorRequest" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "SupervisorInvitation" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Announcement" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Deliverable" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Submission" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "WorkStreamComment" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "WorkStreamAttachment" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "TeamIssue" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "TeamIssueComment" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "TeamIssueActivity" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "ActivityLog" ALTER COLUMN "workspaceId" SET NOT NULL;

-- 6) Foreign keys to Workspace (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Proposal_workspaceId_fkey') THEN
    ALTER TABLE "Proposal"
      ADD CONSTRAINT "Proposal_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupervisorRequest_workspaceId_fkey') THEN
    ALTER TABLE "SupervisorRequest"
      ADD CONSTRAINT "SupervisorRequest_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupervisorInvitation_workspaceId_fkey') THEN
    ALTER TABLE "SupervisorInvitation"
      ADD CONSTRAINT "SupervisorInvitation_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_workspaceId_fkey') THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Announcement_workspaceId_fkey') THEN
    ALTER TABLE "Announcement"
      ADD CONSTRAINT "Announcement_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Deliverable_workspaceId_fkey') THEN
    ALTER TABLE "Deliverable"
      ADD CONSTRAINT "Deliverable_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Submission_workspaceId_fkey') THEN
    ALTER TABLE "Submission"
      ADD CONSTRAINT "Submission_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkStreamComment_workspaceId_fkey') THEN
    ALTER TABLE "WorkStreamComment"
      ADD CONSTRAINT "WorkStreamComment_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkStreamAttachment_workspaceId_fkey') THEN
    ALTER TABLE "WorkStreamAttachment"
      ADD CONSTRAINT "WorkStreamAttachment_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamIssue_workspaceId_fkey') THEN
    ALTER TABLE "TeamIssue"
      ADD CONSTRAINT "TeamIssue_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamIssueComment_workspaceId_fkey') THEN
    ALTER TABLE "TeamIssueComment"
      ADD CONSTRAINT "TeamIssueComment_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamIssueActivity_workspaceId_fkey') THEN
    ALTER TABLE "TeamIssueActivity"
      ADD CONSTRAINT "TeamIssueActivity_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityLog_workspaceId_fkey') THEN
    ALTER TABLE "ActivityLog"
      ADD CONSTRAINT "ActivityLog_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- 7) Indexes (workspace-heavy)
CREATE INDEX IF NOT EXISTS "Proposal_workspaceId_createdAt_idx"
  ON "Proposal"("workspaceId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SupervisorRequest_workspaceId_createdAt_idx"
  ON "SupervisorRequest"("workspaceId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SupervisorInvitation_workspaceId_createdAt_idx"
  ON "SupervisorInvitation"("workspaceId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Notification_workspaceId_authUserId_createdAt_idx"
  ON "Notification"("workspaceId", "authUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Announcement_workspaceId_createdAt_idx"
  ON "Announcement"("workspaceId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Deliverable_workspaceId_createdAt_idx"
  ON "Deliverable"("workspaceId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Submission_workspaceId_submittedAt_idx"
  ON "Submission"("workspaceId", "submittedAt" DESC);

CREATE INDEX IF NOT EXISTS "WorkStreamComment_workspaceId_createdAt_idx"
  ON "WorkStreamComment"("workspaceId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "WorkStreamAttachment_workspaceId_createdAt_idx"
  ON "WorkStreamAttachment"("workspaceId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "TeamIssue_workspaceId_createdAt_idx"
  ON "TeamIssue"("workspaceId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "TeamIssueComment_workspaceId_createdAt_idx"
  ON "TeamIssueComment"("workspaceId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "TeamIssueActivity_workspaceId_createdAt_idx"
  ON "TeamIssueActivity"("workspaceId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ActivityLog_workspaceId_createdAt_idx"
  ON "ActivityLog"("workspaceId", "createdAt" DESC);

-- 8) New TeamMember composite uniqueness + helper indexes
CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_teamId_authUserId_key"
  ON "TeamMember"("teamId", "authUserId");

CREATE INDEX IF NOT EXISTS "TeamMember_authUserId_idx"
  ON "TeamMember"("authUserId");

