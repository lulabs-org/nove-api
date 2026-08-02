-- AlterTable: add invitation fields to users
ALTER TABLE "users" ADD COLUMN "invitation_token" VARCHAR(64),
ADD COLUMN "invitation_expires_at" TIMESTAMPTZ(6),
ADD COLUMN "invitation_accepted_at" TIMESTAMPTZ(6);

-- CreateIndex: unique constraint on invitation_token
CREATE UNIQUE INDEX "users_invitation_token_key" ON "users"("invitation_token");

-- AlterType: extend MemberStatus enum with PENDING and AGREED
ALTER TYPE "MemberStatus" ADD VALUE 'PENDING';
ALTER TYPE "MemberStatus" ADD VALUE 'AGREED';

-- Data migration: convert existing INVITED members to PENDING
UPDATE "org_members" SET "status" = 'PENDING' WHERE "status" = 'INVITED';
