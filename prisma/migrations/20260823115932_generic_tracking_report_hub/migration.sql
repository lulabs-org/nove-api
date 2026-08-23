-- CreateEnum
CREATE TYPE "TrackingTargetType" AS ENUM ('USER', 'PLATFORM_USER', 'PROJECT', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "TargetTrackingReportType" AS ENUM ('MEETING_SUMMARY', 'TRAINING_PLAN', 'DEVELOPMENT_PLAN', 'PROJECT_PROGRESS', 'USER_PROFILE');

-- CreateEnum
CREATE TYPE "TrackingSourceType" AS ENUM ('SPEAKER_SUMMARY', 'TRACKING_REPORT', 'DOCUMENT', 'MEETING');

-- CreateEnum
CREATE TYPE "TrackingReportCadence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "tracking_reports" (
    "id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "tracking_type" "TargetTrackingReportType" NOT NULL,
    "cadence" "TrackingReportCadence" NOT NULL,
    "period_key" VARCHAR(50),
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Shanghai',
    "content" TEXT NOT NULL,
    "generated_by" "GenerationMethod",
    "ai_model" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tracking_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_report_sources" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "source_type" "TrackingSourceType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tracking_report_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_targets" (
    "id" TEXT NOT NULL,
    "target_type" "TrackingTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "name_snapshot" VARCHAR(100) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tracking_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracking_reports_target_id_tracking_type_period_start_idx" ON "tracking_reports"("target_id", "tracking_type", "period_start");

-- CreateIndex
CREATE INDEX "tracking_reports_tracking_type_cadence_period_start_idx" ON "tracking_reports"("tracking_type", "cadence", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tracking_report_period" ON "tracking_reports"("target_id", "tracking_type", "period_key");

-- CreateIndex
CREATE INDEX "tracking_report_sources_source_type_source_id_idx" ON "tracking_report_sources"("source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_report_sources_report_id_source_type_source_id_key" ON "tracking_report_sources"("report_id", "source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_targets_target_type_target_id_key" ON "tracking_targets"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "tracking_reports" ADD CONSTRAINT "tracking_reports_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "tracking_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_report_sources" ADD CONSTRAINT "tracking_report_sources_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "tracking_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
