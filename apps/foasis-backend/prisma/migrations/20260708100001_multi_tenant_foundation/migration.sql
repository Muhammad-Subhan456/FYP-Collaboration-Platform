-- Multi-tenant foundation (Phase 1)

CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coordinatorEmail" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "Workspace_isArchived_createdAt_idx" ON "Workspace"("isArchived", "createdAt" DESC);

CREATE TABLE "WorkspaceMembership" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key" ON "WorkspaceMembership"("workspaceId", "userId");
CREATE INDEX "WorkspaceMembership_userId_idx" ON "WorkspaceMembership"("userId");
CREATE INDEX "WorkspaceMembership_workspaceId_role_idx" ON "WorkspaceMembership"("workspaceId", "role");

ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Default legacy workspace for existing data
INSERT INTO "Workspace" ("id", "name", "slug", "description", "coordinatorEmail", "isArchived", "createdAt", "updatedAt")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Institution',
    'default',
    'Legacy workspace for existing FOASIS data',
    'coordinator@default.local',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

ALTER TABLE "Team" ADD COLUMN "workspaceId" TEXT;
UPDATE "Team" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
ALTER TABLE "Team" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Team" ADD CONSTRAINT "Team_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Team_workspaceId_isOpen_idx" ON "Team"("workspaceId", "isOpen");
CREATE INDEX "Team_workspaceId_createdAt_idx" ON "Team"("workspaceId", "createdAt" DESC);

ALTER TABLE "Evaluation" ADD COLUMN "workspaceId" TEXT;
UPDATE "Evaluation" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
ALTER TABLE "Evaluation" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Evaluation_workspaceId_date_idx" ON "Evaluation"("workspaceId", "date");

ALTER TABLE "GlobalAnnouncement" ADD COLUMN "workspaceId" TEXT;
UPDATE "GlobalAnnouncement" SET "workspaceId" = '00000000-0000-0000-0000-000000000001' WHERE "workspaceId" IS NULL;
ALTER TABLE "GlobalAnnouncement" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "GlobalAnnouncement" ADD CONSTRAINT "GlobalAnnouncement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "GlobalAnnouncement_workspaceId_createdAt_idx" ON "GlobalAnnouncement"("workspaceId", "createdAt" DESC);

-- Backfill workspace memberships from existing users
INSERT INTO "WorkspaceMembership" ("id", "workspaceId", "userId", "role", "isActive", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    '00000000-0000-0000-0000-000000000001',
    u."id",
    u."role",
    u."isActive",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role"::text != 'SUPER_ADMIN'
ON CONFLICT ("workspaceId", "userId") DO NOTHING;
