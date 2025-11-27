-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "user_periodic_summaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "summaryDate" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_periodic_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_periodic_summaries_userId_idx" ON "user_periodic_summaries"("userId");

-- CreateIndex
CREATE INDEX "user_periodic_summaries_periodType_idx" ON "user_periodic_summaries"("periodType");

-- CreateIndex
CREATE INDEX "user_periodic_summaries_summaryDate_idx" ON "user_periodic_summaries"("summaryDate");

-- CreateIndex
CREATE INDEX "user_periodic_summaries_createdAt_idx" ON "user_periodic_summaries"("createdAt");

-- CreateIndex
CREATE INDEX "user_periodic_summaries_deletedAt_idx" ON "user_periodic_summaries"("deletedAt");

-- AddForeignKey
ALTER TABLE "user_periodic_summaries" ADD CONSTRAINT "user_periodic_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
