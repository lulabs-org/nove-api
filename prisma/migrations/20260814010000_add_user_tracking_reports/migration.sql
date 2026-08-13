-- Expand phase: introduce long-term tracking tables while legacy summaries remain writable.
CREATE TYPE "TrackingReportType" AS ENUM (
  'PERIODIC_MEETING_SUMMARY', 'TRAINING_PLAN', 'PROJECT_PROGRESS', 'USER_PROFILE'
);
CREATE TYPE "TrackingCadence" AS ENUM (
  'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'
);

CREATE TABLE "user_tracking_reports" (
  "id" TEXT NOT NULL,
  "subject_user_id" TEXT,
  "platform_user_id" TEXT,
  "project_id" TEXT,
  "subject_name_snapshot" VARCHAR(100) NOT NULL,
  "tracking_type" "TrackingReportType" NOT NULL,
  "cadence" "TrackingCadence" NOT NULL,
  "period_start" TIMESTAMPTZ(6) NOT NULL,
  "period_end" TIMESTAMPTZ(6) NOT NULL,
  "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Shanghai',
  "content" TEXT NOT NULL,
  "structured_data" JSONB NOT NULL DEFAULT '{}',
  "schema_version" INTEGER NOT NULL DEFAULT 1,
  "generated_by" "GenerationMethod",
  "ai_model" TEXT,
  "confidence" DOUBLE PRECISION,
  "version_group_key" VARCHAR(700) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_latest" BOOLEAN NOT NULL DEFAULT true,
  "previous_report_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "user_tracking_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ck_user_tracking_report_identity" CHECK ("subject_user_id" IS NOT NULL OR "platform_user_id" IS NOT NULL),
  CONSTRAINT "ck_user_tracking_report_period" CHECK ("period_start" <= "period_end"),
  CONSTRAINT "ck_user_tracking_report_schema" CHECK ("schema_version" = 1),
  CONSTRAINT "ck_user_tracking_report_project" CHECK (
    ("tracking_type" = 'PROJECT_PROGRESS' AND "project_id" IS NOT NULL) OR
    ("tracking_type" <> 'PROJECT_PROGRESS' AND "project_id" IS NULL)
  )
);

CREATE TABLE "tracking_report_recording_summary_sources" (
  "id" TEXT NOT NULL,
  "report_id" TEXT NOT NULL,
  "recording_summary_id" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tracking_report_recording_summary_sources_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "tracking_report_source_reports" (
  "id" TEXT NOT NULL,
  "report_id" TEXT NOT NULL,
  "source_report_id" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tracking_report_source_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ck_tracking_report_not_self_source" CHECK ("report_id" <> "source_report_id")
);

CREATE UNIQUE INDEX "uq_user_tracking_report_version" ON "user_tracking_reports"("version_group_key", "version");
CREATE UNIQUE INDEX "uq_user_tracking_report_active_latest" ON "user_tracking_reports"("version_group_key") WHERE "is_latest" AND "deleted_at" IS NULL;
CREATE INDEX "user_tracking_reports_subject_user_id_tracking_type_period__idx" ON "user_tracking_reports"("subject_user_id", "tracking_type", "period_start");
CREATE INDEX "user_tracking_reports_platform_user_id_tracking_type_period_idx" ON "user_tracking_reports"("platform_user_id", "tracking_type", "period_start");
CREATE INDEX "user_tracking_reports_project_id_tracking_type_period_start_idx" ON "user_tracking_reports"("project_id", "tracking_type", "period_start");
CREATE INDEX "user_tracking_reports_tracking_type_cadence_period_start_idx" ON "user_tracking_reports"("tracking_type", "cadence", "period_start");
CREATE INDEX "user_tracking_reports_previous_report_id_idx" ON "user_tracking_reports"("previous_report_id");
CREATE UNIQUE INDEX "tracking_report_recording_summary_sources_report_id_recordi_key" ON "tracking_report_recording_summary_sources"("report_id", "recording_summary_id");
CREATE INDEX "tracking_report_recording_summary_sources_recording_summary_idx" ON "tracking_report_recording_summary_sources"("recording_summary_id");
CREATE UNIQUE INDEX "tracking_report_source_reports_report_id_source_report_id_key" ON "tracking_report_source_reports"("report_id", "source_report_id");
CREATE INDEX "tracking_report_source_reports_source_report_id_idx" ON "tracking_report_source_reports"("source_report_id");

ALTER TABLE "user_tracking_reports" ADD CONSTRAINT "user_tracking_reports_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_tracking_reports" ADD CONSTRAINT "user_tracking_reports_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "user_platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_tracking_reports" ADD CONSTRAINT "user_tracking_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_tracking_reports" ADD CONSTRAINT "user_tracking_reports_previous_report_id_fkey" FOREIGN KEY ("previous_report_id") REFERENCES "user_tracking_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tracking_report_recording_summary_sources" ADD CONSTRAINT "tracking_report_recording_summary_sources_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "user_tracking_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tracking_report_recording_summary_sources" ADD CONSTRAINT "tracking_report_recording_summary_sources_recording_summar_fkey" FOREIGN KEY ("recording_summary_id") REFERENCES "participant_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tracking_report_source_reports" ADD CONSTRAINT "tracking_report_source_reports_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "user_tracking_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tracking_report_source_reports" ADD CONSTRAINT "tracking_report_source_reports_source_report_id_fkey" FOREIGN KEY ("source_report_id") REFERENCES "user_tracking_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Idempotent backfill. Ranking makes merged cross-platform identity histories deterministic.
UPDATE "user_tracking_reports"
SET "is_latest" = false
WHERE "tracking_type" = 'PERIODIC_MEETING_SUMMARY';

WITH candidates AS (
  SELECT ps.*, pu.local_user_id,
    COALESCE(pu.local_user_id, 'platform:' || ps.platform_user_id) AS identity_key,
    ps.period_type::text::"TrackingCadence" AS cadence_value
  FROM "participant_summaries" ps
  LEFT JOIN "user_platforms" pu ON pu.id = ps.platform_user_id
  WHERE ps.period_type <> 'SINGLE' AND ps.period_start IS NOT NULL AND ps.period_end IS NOT NULL
), ranked AS (
  SELECT c.*,
    'periodic:' || identity_key || ':' || cadence_value::text || ':' ||
      (extract(epoch FROM period_start) * 1000)::bigint || ':' ||
      (extract(epoch FROM period_end) * 1000)::bigint AS group_key,
    row_number() OVER (
      PARTITION BY identity_key, cadence_value, period_start, period_end
      ORDER BY created_at, id
    ) AS migrated_version,
    deleted_at IS NULL AND row_number() OVER (
      PARTITION BY identity_key, cadence_value, period_start, period_end
      ORDER BY (deleted_at IS NULL) DESC, created_at DESC, id DESC
    ) = 1 AS migrated_latest,
    lag(id) OVER (
      PARTITION BY identity_key, cadence_value, period_start, period_end
      ORDER BY created_at, id
    ) AS migrated_previous
  FROM candidates c
)
INSERT INTO "user_tracking_reports" (
  id, subject_user_id, platform_user_id, subject_name_snapshot, tracking_type,
  cadence, period_start, period_end, content, structured_data, schema_version,
  generated_by, ai_model, confidence, version_group_key, version, is_latest,
  previous_report_id, created_at, updated_at, deleted_at
)
SELECT id, local_user_id, platform_user_id, user_name, 'PERIODIC_MEETING_SUMMARY',
  cadence_value, period_start, period_end, part_summary, '{}'::jsonb, 1,
  generated_by, ai_model, confidence, group_key, migrated_version, migrated_latest,
  migrated_previous, created_at, updated_at, deleted_at
FROM ranked
ON CONFLICT (id) DO UPDATE SET
  subject_user_id = EXCLUDED.subject_user_id,
  platform_user_id = EXCLUDED.platform_user_id,
  content = EXCLUDED.content,
  is_latest = EXCLUDED.is_latest,
  deleted_at = EXCLUDED.deleted_at,
  updated_at = EXCLUDED.updated_at;

-- Relations are normalized by actual period rank, not misleading legacy column names.
WITH relation_nodes AS (
  SELECT r.id relation_id, r.metadata, r.created_at,
    p.id p_id, p.period_type p_type,
    c.id c_id, c.period_type c_type,
    CASE p.period_type WHEN 'SINGLE' THEN 0 WHEN 'DAILY' THEN 1 WHEN 'WEEKLY' THEN 2 WHEN 'MONTHLY' THEN 3 WHEN 'QUARTERLY' THEN 4 WHEN 'YEARLY' THEN 5 END p_rank,
    CASE c.period_type WHEN 'SINGLE' THEN 0 WHEN 'DAILY' THEN 1 WHEN 'WEEKLY' THEN 2 WHEN 'MONTHLY' THEN 3 WHEN 'QUARTERLY' THEN 4 WHEN 'YEARLY' THEN 5 END c_rank
  FROM summary_relations r
  JOIN participant_summaries p ON p.id = r.parent_summary_id
  JOIN participant_summaries c ON c.id = r.child_summary_id
  WHERE r.deleted_at IS NULL
)
INSERT INTO tracking_report_recording_summary_sources(id, report_id, recording_summary_id, metadata, created_at)
SELECT 'mig_' || md5(relation_id || ':recording'),
  CASE WHEN p_rank > c_rank THEN p_id ELSE c_id END,
  CASE WHEN p_rank = 0 THEN p_id ELSE c_id END,
  COALESCE(metadata, '{}'), created_at
FROM relation_nodes
WHERE least(p_rank, c_rank) = 0 AND greatest(p_rank, c_rank) > 0
ON CONFLICT (report_id, recording_summary_id) DO NOTHING;

WITH relation_nodes AS (
  SELECT r.id relation_id, r.metadata, r.created_at,
    p.id p_id, p.period_type p_type,
    c.id c_id, c.period_type c_type,
    CASE p.period_type WHEN 'DAILY' THEN 1 WHEN 'WEEKLY' THEN 2 WHEN 'MONTHLY' THEN 3 WHEN 'QUARTERLY' THEN 4 WHEN 'YEARLY' THEN 5 ELSE 0 END p_rank,
    CASE c.period_type WHEN 'DAILY' THEN 1 WHEN 'WEEKLY' THEN 2 WHEN 'MONTHLY' THEN 3 WHEN 'QUARTERLY' THEN 4 WHEN 'YEARLY' THEN 5 ELSE 0 END c_rank
  FROM summary_relations r
  JOIN participant_summaries p ON p.id = r.parent_summary_id
  JOIN participant_summaries c ON c.id = r.child_summary_id
  WHERE r.deleted_at IS NULL
)
INSERT INTO tracking_report_source_reports(id, report_id, source_report_id, metadata, created_at)
SELECT 'mig_' || md5(relation_id || ':report'),
  CASE WHEN p_rank > c_rank THEN p_id ELSE c_id END,
  CASE WHEN p_rank < c_rank THEN p_id ELSE c_id END,
  COALESCE(metadata, '{}'), created_at
FROM relation_nodes
WHERE p_rank > 0 AND c_rank > 0 AND p_rank <> c_rank
ON CONFLICT (report_id, source_report_id) DO NOTHING;
