-- Add Evaluator role (must commit before use in later migrations)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'EVALUATOR';
ALTER TYPE "ProfileType" ADD VALUE IF NOT EXISTS 'EVALUATOR';
