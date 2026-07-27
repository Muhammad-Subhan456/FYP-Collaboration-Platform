-- Fix multi-tenancy: TeamMember.authUserId was globally unique in the init
-- migration (UNIQUE INDEX). Phase 1 tried DROP CONSTRAINT, which is a no-op for
-- indexes, so a student still could not join teams in a second workspace.
--
-- Keep the composite unique (teamId, authUserId) and the non-unique authUserId index.

DROP INDEX IF EXISTS "TeamMember_authUserId_key";
