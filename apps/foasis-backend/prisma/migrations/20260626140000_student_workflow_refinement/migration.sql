-- PostgreSQL requires new enum values to be committed in their own migration
-- before they can be referenced in UPDATE/INSERT statements.
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'IGNORED';
