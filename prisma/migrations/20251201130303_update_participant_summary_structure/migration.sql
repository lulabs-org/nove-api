/*
  Warnings:

  - Added the required column `periodType` to the `participant_summaries` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('SINGLE', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- AlterTable
ALTER TABLE "participant_summaries" ADD COLUMN     "childSummaryIds" TEXT[],
ADD COLUMN     "periodType" "PeriodType" NOT NULL,
ADD COLUMN     "summaryDate" TIMESTAMP(3),
ALTER COLUMN "recordFile" DROP NOT NULL,
ALTER COLUMN "recordFileId" DROP NOT NULL,
ALTER COLUMN "meetStartTime" DROP NOT NULL,
ALTER COLUMN "meetingSummary" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "participant_summaries_periodType_idx" ON "participant_summaries"("periodType");

-- CreateIndex
CREATE INDEX "participant_summaries_summaryDate_idx" ON "participant_summaries"("summaryDate");
