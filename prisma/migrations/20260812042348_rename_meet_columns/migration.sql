ALTER TABLE "meetings" RENAME COLUMN "hasRecording" TO "has_recording";
ALTER TABLE "meetings" RENAME COLUMN "recordingStatus" TO "recording_status";
ALTER TABLE "meetings" RENAME COLUMN "processingStatus" TO "processing_status";
ALTER TABLE "meetings" RENAME COLUMN "participantCount" TO "participant_count";

ALTER INDEX "meetings_recordingStatus_idx" RENAME TO "meetings_recording_status_idx";
ALTER INDEX "meetings_processingStatus_idx" RENAME TO "meetings_processing_status_idx";
