-- CreateTable
CREATE TABLE "transcript_segments" (
    "id" TEXT NOT NULL,
    "transcript_id" TEXT NOT NULL,
    "speaker_id" TEXT,
    "speaker_name" TEXT,
    "start_time_ms" BIGINT NOT NULL,
    "end_time_ms" BIGINT NOT NULL,
    "text" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "words_detail" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transcript_segments_transcript_id_start_time_ms_idx" ON "transcript_segments"("transcript_id", "start_time_ms");

-- CreateIndex
CREATE INDEX "transcript_segments_speaker_id_idx" ON "transcript_segments"("speaker_id");

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "user_platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
