-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('STUDENT', 'SUPERVISOR', 'COORDINATOR');

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "profileType" "ProfileType" NOT NULL DEFAULT 'STUDENT';
ALTER TABLE "UserProfile" ADD COLUMN "profilePicture" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "email" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "registrationNumber" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "batch" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "degreeProgram" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "linkedIn" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "github" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "facultyId" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "designation" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "officeLocation" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "biography" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "researchAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserProfile" ADD COLUMN "publications" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserProfile" ADD COLUMN "officeHours" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "googleScholar" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "coordinatorRole" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "contactInformation" TEXT;

ALTER TABLE "UserProfile" ALTER COLUMN "department" DROP NOT NULL;
ALTER TABLE "UserProfile" ALTER COLUMN "semester" DROP NOT NULL;
ALTER TABLE "UserProfile" ALTER COLUMN "skills" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserProfile" ALTER COLUMN "interests" SET DEFAULT ARRAY[]::TEXT[];
