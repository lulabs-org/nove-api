/*
  Warnings:

  - You are about to drop the column `childSummaryIds` on the `participant_summaries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "participant_summaries" DROP COLUMN "childSummaryIds";

-- CreateTable
CREATE TABLE "summary_relations" (
    "id" TEXT NOT NULL,
    "parentSummaryId" TEXT NOT NULL,
    "childSummaryId" TEXT NOT NULL,
    "parentPeriodType" "PeriodType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "summary_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "summary_relations_parentSummaryId_idx" ON "summary_relations"("parentSummaryId");

-- CreateIndex
CREATE INDEX "summary_relations_childSummaryId_idx" ON "summary_relations"("childSummaryId");

-- CreateIndex
CREATE INDEX "summary_relations_parentPeriodType_idx" ON "summary_relations"("parentPeriodType");

-- CreateIndex
CREATE UNIQUE INDEX "summary_relations_parentSummaryId_childSummaryId_key" ON "summary_relations"("parentSummaryId", "childSummaryId");

-- AddForeignKey
ALTER TABLE "summary_relations" ADD CONSTRAINT "summary_relations_parentSummaryId_fkey" FOREIGN KEY ("parentSummaryId") REFERENCES "participant_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summary_relations" ADD CONSTRAINT "summary_relations_childSummaryId_fkey" FOREIGN KEY ("childSummaryId") REFERENCES "participant_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
