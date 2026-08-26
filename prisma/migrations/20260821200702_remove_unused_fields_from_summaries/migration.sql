/*
  Warnings:

  - You are about to drop the column `confidence` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `error_message` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `processing_time` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `confidence` on the `speaker_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `speaker_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `transcript_segments` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `transcripts` table. All the data in the column will be lost.
  - You are about to drop the column `confidence` on the `user_tracking_reports` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[minute_id,version]` on the table `minute_summaries` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."idx_minute_summary_is_latest";

-- DropIndex
DROP INDEX "public"."idx_minute_summary_language";

-- DropIndex
DROP INDEX "public"."idx_minute_summary_status";

-- DropIndex
DROP INDEX "public"."idx_minute_summary_status_created";

-- DropIndex
DROP INDEX "public"."idx_minute_summary_version";

-- DropIndex
DROP INDEX "public"."minute_participant_summaries_minute_id_platform_user_id_del_idx";

-- AlterTable
ALTER TABLE "minute_summaries" DROP COLUMN "confidence",
DROP COLUMN "deleted_at",
DROP COLUMN "error_message",
DROP COLUMN "language",
DROP COLUMN "processing_time",
DROP COLUMN "status",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "speaker_summaries" RENAME CONSTRAINT "minute_participant_summaries_pkey" TO "speaker_summaries_pkey";

ALTER TABLE "speaker_summaries"
DROP COLUMN "confidence",
DROP COLUMN "deleted_at";

-- AlterTable
ALTER TABLE "transcript_segments" DROP COLUMN "deleted_at";

-- AlterTable
ALTER TABLE "transcripts" DROP COLUMN "deleted_at";

-- AlterTable
ALTER TABLE "user_tracking_reports" DROP COLUMN "confidence";

-- CreateIndex
CREATE UNIQUE INDEX "uq_minute_summary_version" ON "minute_summaries"("minute_id", "version");

-- CreateIndex
CREATE INDEX "speaker_summaries_minute_id_platform_user_id_idx" ON "speaker_summaries"("minute_id", "platform_user_id");

-- RenameForeignKey
ALTER TABLE "speaker_summaries" RENAME CONSTRAINT "minute_participant_summaries_minute_id_fkey" TO "speaker_summaries_minute_id_fkey";

-- RenameForeignKey
ALTER TABLE "speaker_summaries" RENAME CONSTRAINT "minute_participant_summaries_platform_user_id_fkey" TO "speaker_summaries_platform_user_id_fkey";
