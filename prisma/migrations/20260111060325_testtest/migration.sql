-- AlterTable
ALTER TABLE "participant_summaries" ADD COLUMN     "end_at" TIMESTAMPTZ(6),
ADD COLUMN     "start_at" TIMESTAMPTZ(6),
ADD COLUMN     "user_id" TEXT;

-- AddForeignKey
ALTER TABLE "participant_summaries" ADD CONSTRAINT "participant_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
