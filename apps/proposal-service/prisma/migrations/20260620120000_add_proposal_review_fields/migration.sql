-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN "reviewFeedback" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN "reviewedById" TEXT;
