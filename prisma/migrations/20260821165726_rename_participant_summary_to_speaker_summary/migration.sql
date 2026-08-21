-- Rename the table
ALTER TABLE "minute_participant_summaries" RENAME TO "speaker_summaries";

-- Rename unique constraints and indexes (Prisma usually generates these dynamically, so we must match what Prisma expects or just rename what we know)
ALTER TABLE "speaker_summaries" RENAME CONSTRAINT "uq_minute_participant_summary_version" TO "uq_speaker_summary_version";

-- Drop columns that are no longer needed
ALTER TABLE "speaker_summaries" DROP COLUMN "observed_start_at", DROP COLUMN "observed_end_at";
