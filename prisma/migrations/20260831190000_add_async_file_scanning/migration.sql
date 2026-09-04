CREATE TYPE "FileScanProvider" AS ENUM ('ALIYUN_SAS', 'CLAMAV', 'POLICY_BYPASS');

ALTER TABLE "file_versions"
  ADD COLUMN "scan_provider" "FileScanProvider" NOT NULL DEFAULT 'POLICY_BYPASS',
  ADD COLUMN "scan_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "scan_result" JSONB,
  ADD COLUMN "scan_started_at" TIMESTAMPTZ(6),
  ADD COLUMN "scan_completed_at" TIMESTAMPTZ(6);

ALTER TABLE "upload_sessions"
  ADD COLUMN "declared_checksum_sha256" VARCHAR(64),
  ADD COLUMN "scan_provider" "FileScanProvider" NOT NULL DEFAULT 'POLICY_BYPASS';

CREATE INDEX "file_versions_status_scan_provider_idx"
  ON "file_versions"("status", "scan_provider");
