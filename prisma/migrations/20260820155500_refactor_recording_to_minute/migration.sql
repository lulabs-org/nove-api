-- 1. 重命名表
ALTER TABLE "meet_recordings" RENAME TO "minutes";
ALTER TABLE "meet_recording_files" RENAME TO "minute_files";
ALTER TABLE "meet_summaries" RENAME TO "minute_summaries";
ALTER TABLE "recording_participant_summaries" RENAME TO "minute_participant_summaries";
ALTER TABLE "tracking_report_recording_summary_sources" RENAME TO "tracking_report_minute_summary_sources";

-- 2. 重命名字段 (外键)
ALTER TABLE "minute_files" RENAME COLUMN "recording_id" TO "minute_id";
ALTER TABLE "minute_summaries" RENAME COLUMN "recording_id" TO "minute_id";
ALTER TABLE "transcripts" RENAME COLUMN "recording_id" TO "minute_id";
ALTER TABLE "minute_participant_summaries" RENAME COLUMN "meeting_recording_id" TO "minute_id";
ALTER TABLE "tracking_report_minute_summary_sources" RENAME COLUMN "recording_summary_id" TO "minute_summary_id";

-- 3. 迁移 Meeting 状态至 Minute
ALTER TABLE "minutes" ADD COLUMN "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "minutes" ADD COLUMN "has_recording" BOOLEAN NOT NULL DEFAULT true;

-- 将 Meeting 中原有的 processing_status 和 has_recording 迁移过来 (根据 meeting_id)
UPDATE "minutes" m
SET "processing_status" = mt."processing_status",
    "has_recording" = mt."has_recording"
FROM "meetings" mt
WHERE m."meeting_id" = mt."id";

-- 4. 删除 Meeting 中废弃的列
ALTER TABLE "meetings" DROP COLUMN "recording_status";
ALTER TABLE "meetings" DROP COLUMN "processing_status";
ALTER TABLE "meetings" DROP COLUMN "has_recording";

-- 5. 修改外键可选约束
ALTER TABLE "minutes" ALTER COLUMN "meeting_id" DROP NOT NULL;
ALTER TABLE "minute_summaries" ALTER COLUMN "meeting_id" DROP NOT NULL;
ALTER TABLE "minute_summaries" ALTER COLUMN "minute_id" SET NOT NULL;

-- 6. 重命名索引和约束，避免和 Prisma 定义有差异
ALTER INDEX "idx_recordings_meeting" RENAME TO "idx_minutes_meeting";
ALTER INDEX "idx_recording_files_recording" RENAME TO "idx_minute_files_minute";
ALTER INDEX "idx_meeting_summary_meeting" RENAME TO "idx_minute_summary_meeting";
ALTER INDEX "idx_meeting_summary_is_latest" RENAME TO "idx_minute_summary_is_latest";
ALTER INDEX "idx_meeting_summary_status" RENAME TO "idx_minute_summary_status";
ALTER INDEX "idx_meeting_summary_created_id" RENAME TO "idx_minute_summary_created_id";
ALTER INDEX "idx_meeting_summary_version" RENAME TO "idx_minute_summary_version";
ALTER INDEX "idx_meeting_summary_parent_summary" RENAME TO "idx_minute_summary_parent_summary";
ALTER INDEX "idx_meeting_summary_language" RENAME TO "idx_minute_summary_language";
ALTER INDEX "idx_meeting_summary_approved_id" RENAME TO "idx_minute_summary_approved_id";
ALTER INDEX "idx_meeting_summary_meeting_latest" RENAME TO "idx_minute_summary_meeting_latest";
ALTER INDEX "idx_meeting_summary_status_created" RENAME TO "idx_minute_summary_status_created";
ALTER INDEX "uq_recording_participant_summary_version" RENAME TO "uq_minute_participant_summary_version";
