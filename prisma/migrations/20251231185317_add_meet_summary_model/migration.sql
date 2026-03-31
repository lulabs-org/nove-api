-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('SINGLE', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "participant_summaries" (
    "id" TEXT NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "platform_user_id" TEXT,
    "meeting_id" TEXT,
    "meeting_recording_id" TEXT,
    "user_name" VARCHAR(100) NOT NULL,
    "part_summary" TEXT NOT NULL,
    "keywords" TEXT[],
    "generated_by" "GenerationMethod",
    "ai_model" TEXT,
    "confidence" DOUBLE PRECISION,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "participant_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summary_relations" (
    "id" TEXT NOT NULL,
    "parent_summary_id" TEXT NOT NULL,
    "child_summary_id" TEXT NOT NULL,
    "parent_period_type" "PeriodType" NOT NULL,
    "child_period_type" "PeriodType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "summary_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participant_summaries_platform_user_id_period_type_idx" ON "participant_summaries"("platform_user_id", "period_type");

-- CreateIndex
CREATE INDEX "participant_summaries_meeting_id_period_type_idx" ON "participant_summaries"("meeting_id", "period_type");

-- CreateIndex
CREATE INDEX "participant_summaries_period_type_created_at_idx" ON "participant_summaries"("period_type", "created_at");

-- CreateIndex
CREATE INDEX "participant_summaries_platform_user_id_deleted_at_idx" ON "participant_summaries"("platform_user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "participant_summaries_period_type_deleted_at_idx" ON "participant_summaries"("period_type", "deleted_at");

-- CreateIndex
CREATE INDEX "summary_relations_parent_summary_id_idx" ON "summary_relations"("parent_summary_id");

-- CreateIndex
CREATE INDEX "summary_relations_child_summary_id_idx" ON "summary_relations"("child_summary_id");

-- CreateIndex
CREATE INDEX "summary_relations_parent_period_type_child_period_type_idx" ON "summary_relations"("parent_period_type", "child_period_type");

-- CreateIndex
CREATE INDEX "summary_relations_parent_period_type_created_at_idx" ON "summary_relations"("parent_period_type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "summary_relations_parent_summary_id_child_summary_id_key" ON "summary_relations"("parent_summary_id", "child_summary_id");

-- AddForeignKey
ALTER TABLE "participant_summaries" ADD CONSTRAINT "participant_summaries_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "user_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_summaries" ADD CONSTRAINT "participant_summaries_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_summaries" ADD CONSTRAINT "participant_summaries_meeting_recording_id_fkey" FOREIGN KEY ("meeting_recording_id") REFERENCES "meet_recordings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summary_relations" ADD CONSTRAINT "summary_relations_parent_summary_id_fkey" FOREIGN KEY ("parent_summary_id") REFERENCES "participant_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summary_relations" ADD CONSTRAINT "summary_relations_child_summary_id_fkey" FOREIGN KEY ("child_summary_id") REFERENCES "participant_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
