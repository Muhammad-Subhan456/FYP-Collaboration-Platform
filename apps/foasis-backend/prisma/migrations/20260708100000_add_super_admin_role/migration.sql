-- Add Super Admin role (must be committed before use in later migrations)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
