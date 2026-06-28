-- Work Stream: per-team records, comments, attachments

ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
CREATE INDEX IF NOT EXISTS "Announcement_teamId_createdAt_idx"
  ON "Announcement"("teamId", "createdAt" DESC);

ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "submissionsOpen" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "Deliverable_teamId_dueDate_idx"
  ON "Deliverable"("teamId", "dueDate");

CREATE TYPE "WorkStreamEntityType" AS ENUM ('ANNOUNCEMENT', 'DELIVERABLE');

CREATE TABLE IF NOT EXISTS "WorkStreamComment" (
  "id" TEXT NOT NULL,
  "entityType" "WorkStreamEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "authUserId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkStreamComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WorkStreamComment_entity_idx"
  ON "WorkStreamComment"("entityType", "entityId", "createdAt");

CREATE TABLE IF NOT EXISTS "WorkStreamAttachment" (
  "id" TEXT NOT NULL,
  "entityType" "WorkStreamEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkStreamAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WorkStreamAttachment_entity_idx"
  ON "WorkStreamAttachment"("entityType", "entityId");
