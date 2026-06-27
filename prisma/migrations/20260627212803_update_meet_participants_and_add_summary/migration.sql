/*
  Warnings:

  - You are about to drop the column `participants` on the `meet_summaries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "meet_summaries" DROP COLUMN "participants",
ADD COLUMN     "speaker_insights" JSONB;
