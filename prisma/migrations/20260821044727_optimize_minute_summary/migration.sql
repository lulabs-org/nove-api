/*
  Warnings:

  - You are about to drop the column `meeting_id` on the `minute_participant_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `meeting_participant_id` on the `minute_participant_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `previous_summary_id` on the `minute_participant_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `user_name` on the `minute_participant_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `version_group_key` on the `minute_participant_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `approved_at` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `approved_id` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `created_id` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `meeting_id` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `parent_summary_id` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `speaker_insights` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `transcript_id` on the `minute_summaries` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[minute_id,platform_user_id,version]` on the table `minute_participant_summaries` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."minute_participant_summaries" DROP CONSTRAINT "recording_participant_summaries_meeting_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."minute_participant_summaries" DROP CONSTRAINT "recording_participant_summaries_meeting_participant_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."minute_participant_summaries" DROP CONSTRAINT "recording_participant_summaries_platform_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."minute_participant_summaries" DROP CONSTRAINT "recording_participant_summaries_previous_summary_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."minute_summaries" DROP CONSTRAINT "meet_summaries_approved_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."minute_summaries" DROP CONSTRAINT "meet_summaries_created_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."minute_summaries" DROP CONSTRAINT "meet_summaries_meeting_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."minute_summaries" DROP CONSTRAINT "meet_summaries_parent_summary_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."minute_summaries" DROP CONSTRAINT "meet_summaries_recording_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."minute_summaries" DROP CONSTRAINT "meet_summaries_transcript_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."minutes" DROP CONSTRAINT "meet_recordings_meeting_id_fkey";

-- DropIndex
DROP INDEX "public"."recording_participant_summaries_meeting_id_meeting_recordin_idx";

-- DropIndex
DROP INDEX "public"."recording_participant_summaries_meeting_participant_id_idx";

-- DropIndex
DROP INDEX "public"."recording_participant_summaries_previous_summary_id_idx";

-- DropIndex
DROP INDEX "public"."uq_minute_participant_summary_version";

-- DropIndex
DROP INDEX "public"."idx_minute_summary_approved_id";

-- DropIndex
DROP INDEX "public"."idx_minute_summary_created_id";

-- DropIndex
DROP INDEX "public"."idx_minute_summary_meeting";

-- DropIndex
DROP INDEX "public"."idx_minute_summary_meeting_latest";

-- DropIndex
DROP INDEX "public"."idx_minute_summary_parent_summary";

-- AlterTable
ALTER TABLE "channels" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "minute_files" RENAME CONSTRAINT "meet_recording_files_pkey" TO "minute_files_pkey";

-- AlterTable
ALTER TABLE "minute_participant_summaries" RENAME CONSTRAINT "recording_participant_summaries_pkey" TO "minute_participant_summaries_pkey";

ALTER TABLE "minute_participant_summaries"
DROP COLUMN "meeting_id",
DROP COLUMN "meeting_participant_id",
DROP COLUMN "previous_summary_id",
DROP COLUMN "user_name",
DROP COLUMN "version_group_key";

-- AlterTable
ALTER TABLE "minute_summaries" RENAME CONSTRAINT "meet_summaries_pkey" TO "minute_summaries_pkey";

ALTER TABLE "minute_summaries"
DROP COLUMN "approved_at",
DROP COLUMN "approved_id",
DROP COLUMN "created_id",
DROP COLUMN "meeting_id",
DROP COLUMN "parent_summary_id",
DROP COLUMN "speaker_insights",
DROP COLUMN "transcript_id";

-- AlterTable
ALTER TABLE "minutes" RENAME CONSTRAINT "meet_recordings_pkey" TO "minutes_pkey";

-- AlterTable
ALTER TABLE "tracking_report_minute_summary_sources" RENAME CONSTRAINT "tracking_report_recording_summary_sources_pkey" TO "tracking_report_minute_summary_sources_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "uq_minute_participant_summary_version" ON "minute_participant_summaries"("minute_id", "platform_user_id", "version");

-- CreateIndex
CREATE INDEX "idx_minute_summary_minute" ON "minute_summaries"("minute_id");

-- RenameForeignKey
ALTER TABLE "minute_files" RENAME CONSTRAINT "meet_recording_files_file_object_id_fkey" TO "minute_files_file_object_id_fkey";

-- RenameForeignKey
ALTER TABLE "minute_files" RENAME CONSTRAINT "meet_recording_files_recording_id_fkey" TO "minute_files_minute_id_fkey";

-- RenameForeignKey
ALTER TABLE "minute_participant_summaries" RENAME CONSTRAINT "recording_participant_summaries_meeting_recording_id_fkey" TO "minute_participant_summaries_minute_id_fkey";

-- RenameForeignKey
ALTER TABLE "minutes" RENAME CONSTRAINT "meet_recordings_recorder_user_id_fkey" TO "minutes_recorder_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "tracking_report_minute_summary_sources" RENAME CONSTRAINT "tracking_report_recording_summary_sources_recording_summar_fkey" TO "tracking_report_minute_summary_sources_minute_summary_id_fkey";

-- RenameForeignKey
ALTER TABLE "tracking_report_minute_summary_sources" RENAME CONSTRAINT "tracking_report_recording_summary_sources_report_id_fkey" TO "tracking_report_minute_summary_sources_report_id_fkey";

-- RenameForeignKey
ALTER TABLE "transcripts" RENAME CONSTRAINT "transcripts_recording_id_fkey" TO "transcripts_minute_id_fkey";

-- AddForeignKey
ALTER TABLE "minutes" ADD CONSTRAINT "minutes_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minute_participant_summaries" ADD CONSTRAINT "minute_participant_summaries_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "user_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minute_summaries" ADD CONSTRAINT "minute_summaries_minute_id_fkey" FOREIGN KEY ("minute_id") REFERENCES "minutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "recording_participant_summaries_meeting_recording_id_platfo_idx" RENAME TO "minute_participant_summaries_minute_id_platform_user_id_del_idx";

-- RenameIndex
ALTER INDEX "tracking_report_recording_summary_sources_recording_summary_idx" RENAME TO "tracking_report_minute_summary_sources_minute_summary_id_idx";

-- RenameIndex
ALTER INDEX "tracking_report_recording_summary_sources_report_id_recordi_key" RENAME TO "tracking_report_minute_summary_sources_report_id_minute_sum_key";

-- RenameIndex
ALTER INDEX "transcripts_recording_id_idx" RENAME TO "transcripts_minute_id_idx";
