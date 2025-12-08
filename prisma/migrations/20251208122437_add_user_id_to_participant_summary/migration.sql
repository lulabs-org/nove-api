-- AlterTable
ALTER TABLE "participant_summaries" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "platformUserId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "participant_summaries_userId_idx" ON "participant_summaries"("userId");

-- AddForeignKey
ALTER TABLE "participant_summaries" ADD CONSTRAINT "participant_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
