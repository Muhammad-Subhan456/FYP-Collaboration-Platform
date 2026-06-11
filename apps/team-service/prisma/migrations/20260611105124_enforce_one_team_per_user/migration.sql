/*
  Warnings:

  - A unique constraint covering the columns `[authUserId]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TeamMember_teamId_authUserId_key";

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_authUserId_key" ON "TeamMember"("authUserId");
