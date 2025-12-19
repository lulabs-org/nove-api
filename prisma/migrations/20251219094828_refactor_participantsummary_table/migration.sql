/*
  Warnings:

  - You are about to drop the column `meetParticipant` on the `participant_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `meetStartTime` on the `participant_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `meetingSummary` on the `participant_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `participantSummary` on the `participant_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `recordFile` on the `participant_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `recordFileId` on the `participant_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `summaryDate` on the `participant_summaries` table. All the data in the column will be lost.
  - Added the required column `endAt` to the `participant_summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `partName` to the `participant_summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `partSummary` to the `participant_summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startAt` to the `participant_summaries` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "participant_summaries_meetStartTime_idx";

-- DropIndex
DROP INDEX "participant_summaries_recordFileId_idx";

-- DropIndex
DROP INDEX "participant_summaries_summaryDate_idx";

-- AlterTable
ALTER TABLE "participant_summaries" DROP COLUMN "meetParticipant",
DROP COLUMN "meetStartTime",
DROP COLUMN "meetingSummary",
DROP COLUMN "participantSummary",
DROP COLUMN "recordFile",
DROP COLUMN "recordFileId",
DROP COLUMN "summaryDate",
ADD COLUMN     "endAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "meetingId" TEXT,
ADD COLUMN     "meetingParticipantId" TEXT,
ADD COLUMN     "partName" VARCHAR(100) NOT NULL,
ADD COLUMN     "partSummary" TEXT NOT NULL,
ADD COLUMN     "startAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "participant_summaries_startAt_endAt_idx" ON "participant_summaries"("startAt", "endAt");

-- CreateIndex
CREATE INDEX "participant_summaries_startAt_idx" ON "participant_summaries"("startAt");

-- CreateIndex
CREATE INDEX "participant_summaries_endAt_idx" ON "participant_summaries"("endAt");

-- AddForeignKey
ALTER TABLE "participant_summaries" ADD CONSTRAINT "participant_summaries_meetingParticipantId_fkey" FOREIGN KEY ("meetingParticipantId") REFERENCES "meet_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_summaries" ADD CONSTRAINT "participant_summaries_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
