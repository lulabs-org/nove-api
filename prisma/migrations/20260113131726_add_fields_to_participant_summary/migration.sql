-- AlterTable
ALTER TABLE "participant_summaries" ADD COLUMN     "summary_end" TIMESTAMPTZ(6),
ADD COLUMN     "summary_start" TIMESTAMPTZ(6),
ADD COLUMN     "user_id" TEXT;

-- AddForeignKey
ALTER TABLE "participant_summaries" ADD CONSTRAINT "participant_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
