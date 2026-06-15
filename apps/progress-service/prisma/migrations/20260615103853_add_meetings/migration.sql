-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('WEEKLY', 'VIVA', 'WORKSHOP', 'DISCUSSION', 'OTHER');

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MeetingType" NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "meetingLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);
