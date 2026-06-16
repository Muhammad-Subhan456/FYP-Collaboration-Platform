-- DropIndex
DROP INDEX "Submission_deliverableId_teamId_key";

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
