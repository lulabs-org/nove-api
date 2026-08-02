-- Data migration: convert existing INVITED members to PENDING.
-- This runs in its own migration/transaction, after the enum values were
-- added (and committed) in 20260730181128_add_invitation_fields_and_member_status.
UPDATE "org_members" SET "status" = 'PENDING' WHERE "status" = 'INVITED';
