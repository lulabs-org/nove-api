/*
  Warnings:

  - You are about to drop the column `user_id` on the `participant_summaries` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."participant_summaries" DROP CONSTRAINT "participant_summaries_user_id_fkey";

-- AlterTable
ALTER TABLE "participant_summaries" DROP COLUMN "user_id";
