DROP INDEX IF EXISTS "system_configs_key_key";

ALTER TABLE "system_configs"
ADD COLUMN "org_id" TEXT;

DO $$
DECLARE
  target_org_id TEXT;
  active_org_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM "system_configs") THEN
    SELECT COUNT(*)
    INTO active_org_count
    FROM "orgs"
    WHERE "active" = TRUE AND "deleted_at" IS NULL;

    IF active_org_count <> 1 THEN
      RAISE EXCEPTION
        'Cannot assign system_configs.org_id: expected exactly one active organization, found %',
        active_org_count;
    END IF;

    SELECT "id"
    INTO target_org_id
    FROM "orgs"
    WHERE "active" = TRUE AND "deleted_at" IS NULL;

    UPDATE "system_configs"
    SET "org_id" = target_org_id;
  END IF;
END $$;

ALTER TABLE "system_configs"
ALTER COLUMN "org_id" SET NOT NULL;

CREATE UNIQUE INDEX "system_configs_org_id_key_key"
ON "system_configs"("org_id", "key");

CREATE INDEX "system_configs_org_id_idx"
ON "system_configs"("org_id");

ALTER TABLE "system_configs"
ADD CONSTRAINT "system_configs_org_id_fkey"
FOREIGN KEY ("org_id") REFERENCES "orgs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
