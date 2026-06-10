-- CreateEnum
CREATE TYPE "Department" AS ENUM ('CS', 'SE', 'IT', 'AI', 'DS');

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "semester" INTEGER NOT NULL,
    "skills" TEXT[],
    "interests" TEXT[],
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_authUserId_key" ON "UserProfile"("authUserId");
