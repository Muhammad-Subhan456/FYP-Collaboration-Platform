-- Phase 3: Global announcement audience, attachments, scheduling, reminder infrastructure

CREATE TYPE "GlobalAnnouncementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED');
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'CANCELLED', 'FAILED');

ALTER TABLE "GlobalAnnouncement"
  ADD COLUMN IF NOT EXISTS "type" "AnnouncementType" NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS "audienceRoles" TEXT[] NOT NULL DEFAULT ARRAY['STUDENT', 'SUPERVISOR', 'EVALUATOR']::TEXT[],
  ADD COLUMN IF NOT EXISTS "publishAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "status" "GlobalAnnouncementStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "GlobalAnnouncement"
SET "publishedAt" = "createdAt"
WHERE "publishedAt" IS NULL AND "status" = 'PUBLISHED';

CREATE TABLE IF NOT EXISTS "GlobalAnnouncementAttachment" (
  "id" TEXT NOT NULL,
  "announcementId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GlobalAnnouncementAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ScheduledReminder" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "reminderType" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "route" TEXT,
  "channels" TEXT[] NOT NULL DEFAULT ARRAY['notification']::TEXT[],
  "audienceSpec" JSONB,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduledReminder_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GlobalAnnouncementAttachment"
  ADD CONSTRAINT "GlobalAnnouncementAttachment_announcementId_fkey"
  FOREIGN KEY ("announcementId") REFERENCES "GlobalAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduledReminder"
  ADD CONSTRAINT "ScheduledReminder_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "GlobalAnnouncement_workspaceId_status_publishAt_idx"
  ON "GlobalAnnouncement"("workspaceId", "status", "publishAt");

CREATE INDEX IF NOT EXISTS "GlobalAnnouncementAttachment_announcementId_idx"
  ON "GlobalAnnouncementAttachment"("announcementId");

CREATE INDEX IF NOT EXISTS "ScheduledReminder_status_scheduledFor_idx"
  ON "ScheduledReminder"("status", "scheduledFor");

CREATE INDEX IF NOT EXISTS "ScheduledReminder_workspaceId_reminderType_idx"
  ON "ScheduledReminder"("workspaceId", "reminderType");
