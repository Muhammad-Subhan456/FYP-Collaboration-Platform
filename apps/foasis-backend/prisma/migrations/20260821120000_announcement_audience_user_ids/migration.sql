-- Individual recipients for coordinator global announcements
ALTER TABLE "GlobalAnnouncement"
  ADD COLUMN IF NOT EXISTS "audienceUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
