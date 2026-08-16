-- Coordinator workspace policy settings + student CSV institution fields

ALTER TABLE "Workspace"
ADD COLUMN "teamMaxMembers" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN "supervisorMaxTeams" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN "supervisorRequestExpiryHours" INTEGER NOT NULL DEFAULT 24;

ALTER TABLE "WorkspaceInvitation"
ADD COLUMN "registrationNumber" TEXT,
ADD COLUMN "batch" TEXT,
ADD COLUMN "department" "Department",
ADD COLUMN "degreeProgram" TEXT;

CREATE INDEX "WorkspaceInvitation_workspaceId_registrationNumber_idx"
ON "WorkspaceInvitation"("workspaceId", "registrationNumber");

ALTER TABLE "UserProfile"
ADD COLUMN "institutionManaged" BOOLEAN NOT NULL DEFAULT false;
