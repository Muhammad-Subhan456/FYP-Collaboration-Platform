-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'PENDING_SUPERVISOR', 'SUPERVISOR_ASSIGNED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "assignedSupervisorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisorRequest" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisorInvitation" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisorInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_teamId_key" ON "Proposal"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorRequest_proposalId_supervisorId_key" ON "SupervisorRequest"("proposalId", "supervisorId");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorInvitation_proposalId_supervisorId_key" ON "SupervisorInvitation"("proposalId", "supervisorId");

-- AddForeignKey
ALTER TABLE "SupervisorRequest" ADD CONSTRAINT "SupervisorRequest_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorInvitation" ADD CONSTRAINT "SupervisorInvitation_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
