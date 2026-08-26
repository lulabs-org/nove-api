-- DropForeignKey
ALTER TABLE "public"."refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";

-- DropIndex
DROP INDEX "public"."refresh_tokens_deviceId_userId_idx";
DROP INDEX "public"."refresh_tokens_expiresAt_idx";
DROP INDEX "public"."refresh_tokens_revokedAt_idx";
DROP INDEX "public"."refresh_tokens_tokenHash_key";
DROP INDEX "public"."refresh_tokens_userId_idx";
DROP INDEX "public"."refresh_tokens_userId_revokedAt_idx";

-- RENAME COLUMNS (Safe operation: keeps data)
ALTER TABLE "refresh_tokens"
  RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "refresh_tokens"
  RENAME COLUMN "deviceId" TO "device_id";
ALTER TABLE "refresh_tokens"
  RENAME COLUMN "deviceInfo" TO "device_info";
ALTER TABLE "refresh_tokens"
  RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "refresh_tokens"
  RENAME COLUMN "replacedBy" TO "replaced_by";
ALTER TABLE "refresh_tokens"
  RENAME COLUMN "revokedAt" TO "revoked_at";
ALTER TABLE "refresh_tokens"
  RENAME COLUMN "tokenHash" TO "token_hash";
ALTER TABLE "refresh_tokens"
  RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "refresh_tokens"
  RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE "refresh_tokens"
  RENAME COLUMN "userId" TO "user_id";

-- ALTER TIME COLUMNS to TIMESTAMPTZ safely 
-- Using AT TIME ZONE 'UTC' ensures existing timestamps are treated as UTC instead of local timezone, preventing time shifts.
ALTER TABLE "refresh_tokens" 
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(6) USING "expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(6) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "revoked_at" TYPE TIMESTAMPTZ(6) USING "revoked_at" AT TIME ZONE 'UTC';

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_device_id_user_id_idx" ON "refresh_tokens"("device_id", "user_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");
CREATE INDEX "refresh_tokens_revoked_at_idx" ON "refresh_tokens"("revoked_at");
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
