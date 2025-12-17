-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('SINGLE', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "participant_summaries" (
    "id" TEXT NOT NULL,
    "platformUserId" TEXT,
    "userId" TEXT,
    "periodType" "PeriodType" NOT NULL,
    "recordFile" VARCHAR(500),
    "recordFileId" VARCHAR(100),
    "meetStartTime" TIMESTAMP(3),
    "meetingSummary" TEXT,
    "summaryDate" TIMESTAMP(3),
    "meetParticipant" VARCHAR(100) NOT NULL,
    "participantSummary" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participant_summaries_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "participant_summaries_platformUserId_idx" ON "participant_summaries"("platformUserId");

-- CreateIndex
CREATE INDEX "participant_summaries_userId_idx" ON "participant_summaries"("userId");

-- CreateIndex
CREATE INDEX "participant_summaries_periodType_idx" ON "participant_summaries"("periodType");

-- CreateIndex
CREATE INDEX "participant_summaries_recordFileId_idx" ON "participant_summaries"("recordFileId");

-- CreateIndex
CREATE INDEX "participant_summaries_meetStartTime_idx" ON "participant_summaries"("meetStartTime");

-- CreateIndex
CREATE INDEX "participant_summaries_summaryDate_idx" ON "participant_summaries"("summaryDate");

-- CreateIndex
CREATE INDEX "participant_summaries_createdAt_idx" ON "participant_summaries"("createdAt");

-- CreateIndex
CREATE INDEX "participant_summaries_deletedAt_idx" ON "participant_summaries"("deletedAt");

-- CreateIndex
CREATE INDEX "summary_relations_parentSummaryId_idx" ON "summary_relations"("parentSummaryId");

-- CreateIndex
CREATE INDEX "summary_relations_childSummaryId_idx" ON "summary_relations"("childSummaryId");

-- CreateIndex
CREATE INDEX "summary_relations_parentPeriodType_idx" ON "summary_relations"("parentPeriodType");

-- CreateIndex
CREATE UNIQUE INDEX "summary_relations_parentSummaryId_childSummaryId_key" ON "summary_relations"("parentSummaryId", "childSummaryId");

-- AddForeignKey
ALTER TABLE "participant_summaries" ADD CONSTRAINT "participant_summaries_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "user_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_summaries" ADD CONSTRAINT "participant_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summary_relations" ADD CONSTRAINT "summary_relations_parentSummaryId_fkey" FOREIGN KEY ("parentSummaryId") REFERENCES "participant_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summary_relations" ADD CONSTRAINT "summary_relations_childSummaryId_fkey" FOREIGN KEY ("childSummaryId") REFERENCES "participant_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
