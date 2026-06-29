-- Drop legacy milestone/task tables
DROP TABLE IF EXISTS "Task";
DROP TABLE IF EXISTS "Milestone";

DROP TYPE IF EXISTS "TaskStatus";
DROP TYPE IF EXISTS "MilestoneStatus";

-- Team work board (issues)
CREATE TYPE "TeamIssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "TeamIssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "TeamIssueActivityType" AS ENUM ('CREATED', 'CLAIMED', 'RELEASED', 'COMPLETED', 'COMMENTED', 'UPDATED');

CREATE TABLE "TeamIssue" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TeamIssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "TeamIssueStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "githubPrUrl" TEXT,
    "githubCommitUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TeamIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamIssueComment" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamIssueComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamIssueActivity" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "TeamIssueActivityType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamIssueActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamIssue_teamId_status_idx" ON "TeamIssue"("teamId", "status");
CREATE INDEX "TeamIssue_teamId_createdAt_idx" ON "TeamIssue"("teamId", "createdAt" DESC);
CREATE INDEX "TeamIssue_assignedToId_status_idx" ON "TeamIssue"("assignedToId", "status");
CREATE INDEX "TeamIssueComment_issueId_createdAt_idx" ON "TeamIssueComment"("issueId", "createdAt");
CREATE INDEX "TeamIssueActivity_issueId_createdAt_idx" ON "TeamIssueActivity"("issueId", "createdAt");

ALTER TABLE "TeamIssueComment" ADD CONSTRAINT "TeamIssueComment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "TeamIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamIssueActivity" ADD CONSTRAINT "TeamIssueActivity_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "TeamIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
