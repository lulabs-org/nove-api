/*
  Warnings:

  - Added the required column `end_at` to the `participant_summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_at` to the `participant_summaries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "participant_summaries" ADD COLUMN     "end_at" TIMESTAMPTZ(6) NOT NULL,
ADD COLUMN     "start_at" TIMESTAMPTZ(6) NOT NULL,
ADD COLUMN     "user_id" TEXT;

-- AddForeignKey
ALTER TABLE "participant_summaries" ADD CONSTRAINT "participant_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
