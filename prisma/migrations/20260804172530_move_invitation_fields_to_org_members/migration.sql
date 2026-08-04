-- Migration: move invitation fields from users to org_members
--
-- Background: invitationToken / invitationExpiresAt / invitationAcceptedAt
-- originally lived on the users table. They describe the lifecycle of an
-- org invitation, which is a property of OrgMember (one user may be invited
-- by multiple orgs in parallel). Move them to org_members so each membership
-- owns its own invitation state.

-- 1. Add invitation columns to org_members
ALTER TABLE "org_members" ADD COLUMN "invitation_token" VARCHAR(64),
ADD COLUMN "invitation_expires_at" TIMESTAMPTZ(6),
ADD COLUMN "invitation_accepted_at" TIMESTAMPTZ(6);

-- 2. Migrate data: copy invitation fields from users to their PENDING org_members.
--    A user could only ever hold one invitation token (unique constraint on
--    users.invitation_token), so we target the membership that is still in
--    PENDING state. AGREED/ACTIVE memberships already passed the invitation
--    stage and do not need the historical token.
UPDATE "org_members" m
SET
  "invitation_token"      = u."invitation_token",
  "invitation_expires_at" = u."invitation_expires_at",
  "invitation_accepted_at" = u."invitation_accepted_at"
FROM "users" u
WHERE m."user_id" = u."id"
  AND u."invitation_token" IS NOT NULL
  AND m."status" = 'PENDING';

-- 3. Create unique index on org_members.invitation_token
--    (nullable: multiple NULLs allowed, matching the previous behavior on users)
CREATE UNIQUE INDEX "org_members_invitation_token_key"
  ON "org_members"("invitation_token");

-- 4. Drop the old unique index and columns on users
DROP INDEX "users_invitation_token_key";
ALTER TABLE "users"
  DROP COLUMN "invitation_token",
  DROP COLUMN "invitation_expires_at",
  DROP COLUMN "invitation_accepted_at";
