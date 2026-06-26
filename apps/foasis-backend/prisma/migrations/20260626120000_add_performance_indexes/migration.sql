-- Performance indexes for common student/supervisor query patterns

CREATE INDEX IF NOT EXISTS "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX IF NOT EXISTS "JoinRequest_teamId_idx" ON "JoinRequest"("teamId");

CREATE INDEX IF NOT EXISTS "Notification_authUserId_createdAt_idx" ON "Notification"("authUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Notification_authUserId_isRead_idx" ON "Notification"("authUserId", "isRead");

CREATE INDEX IF NOT EXISTS "Meeting_supervisorId_meetingDate_idx" ON "Meeting"("supervisorId", "meetingDate");
CREATE INDEX IF NOT EXISTS "Announcement_supervisorId_createdAt_idx" ON "Announcement"("supervisorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Deliverable_supervisorId_isActive_dueDate_idx" ON "Deliverable"("supervisorId", "isActive", "dueDate");

CREATE INDEX IF NOT EXISTS "Submission_teamId_status_idx" ON "Submission"("teamId", "status");
CREATE INDEX IF NOT EXISTS "Submission_teamId_deliverableId_version_idx" ON "Submission"("teamId", "deliverableId", "version" DESC);

CREATE INDEX IF NOT EXISTS "Milestone_proposalId_idx" ON "Milestone"("proposalId");
CREATE INDEX IF NOT EXISTS "Task_assignedTo_status_idx" ON "Task"("assignedTo", "status");

CREATE INDEX IF NOT EXISTS "ActivityLog_authUserId_createdAt_idx" ON "ActivityLog"("authUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "EvaluationAssignment_teamId_idx" ON "EvaluationAssignment"("teamId");
CREATE INDEX IF NOT EXISTS "EvaluationResult_teamId_createdAt_idx" ON "EvaluationResult"("teamId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Proposal_assignedSupervisorId_status_idx" ON "Proposal"("assignedSupervisorId", "status");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
