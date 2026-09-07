ALTER TABLE "meetings" ADD COLUMN "org_id" TEXT;

CREATE INDEX "meetings_org_id_idx" ON "meetings"("org_id");
CREATE INDEX "meetings_org_id_start_at_idx" ON "meetings"("org_id", "start_at");

ALTER TABLE "meetings"
ADD CONSTRAINT "meetings_org_id_fkey"
FOREIGN KEY ("org_id") REFERENCES "orgs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
