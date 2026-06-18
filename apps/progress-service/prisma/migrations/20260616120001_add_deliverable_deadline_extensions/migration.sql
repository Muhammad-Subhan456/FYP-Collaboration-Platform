-- CreateTable
CREATE TABLE "DeliverableDeadlineExtension" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "previousDueDate" TIMESTAMP(3) NOT NULL,
    "newDueDate" TIMESTAMP(3) NOT NULL,
    "extendedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliverableDeadlineExtension_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeliverableDeadlineExtension" ADD CONSTRAINT "DeliverableDeadlineExtension_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
