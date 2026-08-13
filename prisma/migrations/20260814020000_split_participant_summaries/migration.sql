-- Contract phase. Run only inside the documented maintenance window.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM participant_summaries
    WHERE period_type = 'SINGLE'
      AND (meeting_id IS NULL OR meeting_recording_id IS NULL OR platform_user_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Cannot split participant summaries: SINGLE rows have missing meeting, recording, or platform identity';
  END IF;
  IF EXISTS (
    SELECT 1 FROM participant_summaries ps
    WHERE ps.period_type <> 'SINGLE'
      AND NOT EXISTS (SELECT 1 FROM user_tracking_reports r WHERE r.id = ps.id)
  ) THEN
    RAISE EXCEPTION 'Cannot split participant summaries: period report backfill is incomplete';
  END IF;
  IF EXISTS (
    SELECT 1 FROM summary_relations r
    JOIN participant_summaries p ON p.id = r.parent_summary_id
    JOIN participant_summaries c ON c.id = r.child_summary_id
    WHERE r.deleted_at IS NULL AND p.period_type = c.period_type
  ) THEN
    RAISE EXCEPTION 'Cannot split participant summaries: equal-rank legacy relation requires manual repair';
  END IF;
END $$;

DELETE FROM participant_summaries WHERE period_type <> 'SINGLE';
DROP TABLE summary_relations;

ALTER TABLE participant_summaries RENAME TO recording_participant_summaries;
ALTER TABLE recording_participant_summaries RENAME CONSTRAINT participant_summaries_pkey TO recording_participant_summaries_pkey;
ALTER TABLE recording_participant_summaries DROP CONSTRAINT participant_summaries_meeting_id_fkey;
ALTER TABLE recording_participant_summaries DROP CONSTRAINT participant_summaries_meeting_recording_id_fkey;
ALTER TABLE recording_participant_summaries RENAME CONSTRAINT participant_summaries_platform_user_id_fkey TO recording_participant_summaries_platform_user_id_fkey;
ALTER TABLE recording_participant_summaries DROP COLUMN period_type;
ALTER TABLE recording_participant_summaries RENAME COLUMN period_start TO observed_start_at;
ALTER TABLE recording_participant_summaries RENAME COLUMN period_end TO observed_end_at;
ALTER TABLE recording_participant_summaries
  ADD COLUMN meeting_participant_id TEXT,
  ADD COLUMN version_group_key VARCHAR(500),
  ADD COLUMN previous_summary_id TEXT;

UPDATE recording_participant_summaries ps SET
  meeting_participant_id = mp.id,
  version_group_key = 'recording:' || ps.meeting_recording_id || ':user:' || ps.platform_user_id
FROM meet_participants mp
WHERE mp.meeting_id = ps.meeting_id
  AND mp.pt_user_id = ps.platform_user_id
  AND mp.deleted_at IS NULL;
UPDATE recording_participant_summaries
SET version_group_key = 'recording:' || meeting_recording_id || ':user:' || platform_user_id
WHERE version_group_key IS NULL;

WITH ordered AS (
  SELECT id,
    row_number() OVER (PARTITION BY version_group_key ORDER BY created_at, id) AS new_version,
    lag(id) OVER (PARTITION BY version_group_key ORDER BY created_at, id) AS previous_id,
    deleted_at IS NULL AND row_number() OVER (
      PARTITION BY version_group_key
      ORDER BY (deleted_at IS NULL) DESC, created_at DESC, id DESC
    ) = 1 AS latest
  FROM recording_participant_summaries
)
UPDATE recording_participant_summaries ps SET
  version = ordered.new_version,
  previous_summary_id = ordered.previous_id,
  is_latest = ordered.latest
FROM ordered WHERE ordered.id = ps.id;

ALTER TABLE recording_participant_summaries
  ALTER COLUMN meeting_id SET NOT NULL,
  ALTER COLUMN meeting_recording_id SET NOT NULL,
  ALTER COLUMN platform_user_id SET NOT NULL,
  ALTER COLUMN version_group_key SET NOT NULL;

ALTER TABLE tracking_report_recording_summary_sources
  DROP CONSTRAINT tracking_report_recording_summary_sources_recording_summar_fkey,
  ADD CONSTRAINT tracking_report_recording_summary_sources_recording_summar_fkey
    FOREIGN KEY (recording_summary_id) REFERENCES recording_participant_summaries(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE recording_participant_summaries
  ADD CONSTRAINT recording_participant_summaries_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT recording_participant_summaries_meeting_recording_id_fkey FOREIGN KEY (meeting_recording_id) REFERENCES meet_recordings(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT recording_participant_summaries_meeting_participant_id_fkey FOREIGN KEY (meeting_participant_id) REFERENCES meet_participants(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT recording_participant_summaries_previous_summary_id_fkey FOREIGN KEY (previous_summary_id) REFERENCES recording_participant_summaries(id) ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS participant_summaries_platform_user_id_period_type_idx;
DROP INDEX IF EXISTS participant_summaries_meeting_id_period_type_idx;
DROP INDEX IF EXISTS participant_summaries_period_type_created_at_idx;
DROP INDEX IF EXISTS participant_summaries_platform_user_id_deleted_at_idx;
DROP INDEX IF EXISTS participant_summaries_period_type_deleted_at_idx;
CREATE UNIQUE INDEX uq_recording_participant_summary_version ON recording_participant_summaries(version_group_key, version);
CREATE UNIQUE INDEX uq_recording_participant_summary_active_latest ON recording_participant_summaries(version_group_key) WHERE is_latest AND deleted_at IS NULL;
CREATE INDEX recording_participant_summaries_meeting_id_meeting_recordin_idx ON recording_participant_summaries(meeting_id, meeting_recording_id, deleted_at);
CREATE INDEX recording_participant_summaries_meeting_recording_id_platfo_idx ON recording_participant_summaries(meeting_recording_id, platform_user_id, deleted_at);
CREATE INDEX recording_participant_summaries_meeting_participant_id_idx ON recording_participant_summaries(meeting_participant_id);
CREATE INDEX recording_participant_summaries_previous_summary_id_idx ON recording_participant_summaries(previous_summary_id);

DROP TYPE "PeriodType";
