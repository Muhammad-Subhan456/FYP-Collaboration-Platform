-- CreateTable
CREATE TABLE "EvaluationPanel" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanelEvaluator" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EVALUATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PanelEvaluator_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "EvaluationAssignment" ADD COLUMN "panelId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PanelEvaluator_panelId_evaluatorId_key" ON "PanelEvaluator"("panelId", "evaluatorId");

-- AddForeignKey
ALTER TABLE "EvaluationPanel" ADD CONSTRAINT "EvaluationPanel_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelEvaluator" ADD CONSTRAINT "PanelEvaluator_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "EvaluationPanel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAssignment" ADD CONSTRAINT "EvaluationAssignment_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "EvaluationPanel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
