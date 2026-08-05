-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Deliverable" DROP CONSTRAINT "Deliverable_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Proposal" DROP CONSTRAINT "Proposal_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "SupervisorInvitation" DROP CONSTRAINT "SupervisorInvitation_proposalId_fkey";

-- DropForeignKey
ALTER TABLE "SupervisorInvitation" DROP CONSTRAINT "SupervisorInvitation_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "SupervisorRequest" DROP CONSTRAINT "SupervisorRequest_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "TeamIssue" DROP CONSTRAINT "TeamIssue_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "TeamIssueActivity" DROP CONSTRAINT "TeamIssueActivity_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "TeamIssueComment" DROP CONSTRAINT "TeamIssueComment_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "WorkStreamAttachment" DROP CONSTRAINT "WorkStreamAttachment_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "WorkStreamComment" DROP CONSTRAINT "WorkStreamComment_workspaceId_fkey";

-- AlterTable
ALTER TABLE "DeliverableTemplate" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GlobalAnnouncement" ALTER COLUMN "audienceRoles" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Phase" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ScheduledReminder" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorRequest" ADD CONSTRAINT "SupervisorRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorInvitation" ADD CONSTRAINT "SupervisorInvitation_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorInvitation" ADD CONSTRAINT "SupervisorInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkStreamComment" ADD CONSTRAINT "WorkStreamComment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkStreamAttachment" ADD CONSTRAINT "WorkStreamAttachment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamIssue" ADD CONSTRAINT "TeamIssue_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamIssueComment" ADD CONSTRAINT "TeamIssueComment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamIssueActivity" ADD CONSTRAINT "TeamIssueActivity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "StudentSubmissionEvaluation_submissionEvaluationId_studentId_ke" RENAME TO "StudentSubmissionEvaluation_submissionEvaluationId_studentI_key";

-- RenameIndex
ALTER INDEX "SubmissionCriterionScore_studentSubmissionEvaluationId_rubricCr" RENAME TO "SubmissionCriterionScore_studentSubmissionEvaluationId_rubr_key";

-- RenameIndex
ALTER INDEX "WorkStreamAttachment_entity_idx" RENAME TO "WorkStreamAttachment_entityType_entityId_idx";

-- RenameIndex
ALTER INDEX "WorkStreamComment_entity_idx" RENAME TO "WorkStreamComment_entityType_entityId_createdAt_idx";
