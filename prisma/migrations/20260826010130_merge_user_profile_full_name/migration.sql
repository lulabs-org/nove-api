-- Merge the existing structured name fields into one user-supplied full name.
-- The preflight check aborts the migration before any schema change if a
-- combined value cannot fit in the requested VARCHAR(200) column.
BEGIN;

DO $$
DECLARE
  oversized_count INTEGER;
BEGIN
  WITH normalized AS (
    SELECT
      NULLIF("firstName", '') AS first_name,
      NULLIF("lastName", '') AS last_name,
      NULLIF("display_name", '') AS display_name
    FROM "user_profiles"
  ), composed AS (
    SELECT CASE
      WHEN first_name IS NULL THEN last_name
      WHEN last_name IS NULL THEN first_name
      WHEN display_name IN (
        first_name || last_name,
        last_name || first_name,
        first_name || ' ' || last_name,
        last_name || ' ' || first_name
      ) THEN display_name
      WHEN first_name ~ '[一-龥ぁ-んァ-ン가-힣]'
        OR last_name ~ '[一-龥ぁ-んァ-ン가-힣]'
        THEN last_name || first_name
      ELSE first_name || ' ' || last_name
    END AS full_name
    FROM normalized
  )
  SELECT COUNT(*)
  INTO oversized_count
  FROM composed
  WHERE char_length(full_name) > 200;

  IF oversized_count > 0 THEN
    RAISE EXCEPTION
      'Cannot merge user profile names without data loss: % value(s) exceed 200 characters',
      oversized_count;
  END IF;
END $$;

ALTER TABLE "user_profiles"
ADD COLUMN "full_name" VARCHAR(200);

WITH normalized AS (
  SELECT
    "id",
    NULLIF("firstName", '') AS first_name,
    NULLIF("lastName", '') AS last_name,
    NULLIF("display_name", '') AS display_name
  FROM "user_profiles"
), composed AS (
  SELECT
    "id",
    CASE
      WHEN first_name IS NULL THEN last_name
      WHEN last_name IS NULL THEN first_name
      WHEN display_name IN (
        first_name || last_name,
        last_name || first_name,
        first_name || ' ' || last_name,
        last_name || ' ' || first_name
      ) THEN display_name
      WHEN first_name ~ '[一-龥ぁ-んァ-ン가-힣]'
        OR last_name ~ '[一-龥ぁ-んァ-ン가-힣]'
        THEN last_name || first_name
      ELSE first_name || ' ' || last_name
    END AS full_name
  FROM normalized
)
UPDATE "user_profiles" AS profile
SET "full_name" = composed.full_name
FROM composed
WHERE profile."id" = composed."id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "user_profiles"
    WHERE (NULLIF("firstName", '') IS NOT NULL OR NULLIF("lastName", '') IS NOT NULL)
      AND "full_name" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot merge user profile names without data loss: backfill verification failed';
  END IF;
END $$;

ALTER TABLE "user_profiles"
DROP COLUMN "firstName",
DROP COLUMN "lastName";

COMMIT;
