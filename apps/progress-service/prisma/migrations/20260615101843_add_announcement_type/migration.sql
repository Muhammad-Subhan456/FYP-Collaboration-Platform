-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('GENERAL', 'DEADLINE', 'MEETING', 'WORKSHOP', 'VIVA');

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "type" "AnnouncementType" NOT NULL DEFAULT 'GENERAL';
