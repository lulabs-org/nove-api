-- AlterTable: add invitation fields to users
ALTER TABLE "users" ADD COLUMN "invitation_token" VARCHAR(64),
ADD COLUMN "invitation_expires_at" TIMESTAMPTZ(6),
ADD COLUMN "invitation_accepted_at" TIMESTAMPTZ(6);

-- CreateIndex: unique constraint on invitation_token
CREATE UNIQUE INDEX "users_invitation_token_key" ON "users"("invitation_token");

-- AlterType: extend MemberStatus enum with PENDING and AGREED
-- NOTE: The data migration that uses 'PENDING' lives in the next migration
-- (20260730181129_migrate_invited_members_to_pending). PostgreSQL forbids
-- using a newly-added enum value inside the same transaction that added it,
-- so the ADD VALUE must be committed in its own migration before use.
ALTER TYPE "MemberStatus" ADD VALUE 'PENDING';
ALTER TYPE "MemberStatus" ADD VALUE 'AGREED';
