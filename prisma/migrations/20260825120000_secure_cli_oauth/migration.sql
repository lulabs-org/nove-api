-- Existing demo authorization codes cannot be upgraded to PKCE safely.
DELETE FROM "oauth_auth_codes";

-- Invalidate and erase legacy plaintext OAuth refresh tokens before renaming the column.
UPDATE "oauth_tokens"
SET "refresh_token" = 'revoked:' || "id", "revoked" = true;
DELETE FROM "oauth_tokens";

CREATE TYPE "OAuthClientType" AS ENUM ('PUBLIC', 'CONFIDENTIAL');

ALTER TABLE "oauth_clients"
  ALTER COLUMN "client_secret" DROP NOT NULL,
  ADD COLUMN "client_type" "OAuthClientType" NOT NULL DEFAULT 'CONFIDENTIAL';

ALTER TABLE "oauth_auth_codes"
  RENAME COLUMN "code" TO "code_hash";

ALTER TABLE "oauth_auth_codes"
  ADD COLUMN "organization_id" TEXT NOT NULL,
  ADD COLUMN "code_challenge" TEXT NOT NULL,
  ADD COLUMN "code_challenge_method" TEXT NOT NULL DEFAULT 'S256';

ALTER TABLE "oauth_tokens"
  RENAME COLUMN "refresh_token" TO "refresh_token_hash";

ALTER TABLE "oauth_tokens"
  ADD COLUMN "family_id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  ADD COLUMN "organization_id" TEXT NOT NULL,
  ADD COLUMN "revoked_at" TIMESTAMPTZ(6),
  ADD COLUMN "rotated_at" TIMESTAMPTZ(6);

CREATE TABLE "oauth_authorization_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" TEXT NOT NULL,
  "redirect_uri" TEXT NOT NULL,
  "requested_scopes" TEXT[] NOT NULL,
  "state" TEXT NOT NULL,
  "code_challenge" TEXT NOT NULL,
  "code_challenge_method" TEXT NOT NULL DEFAULT 'S256',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "oauth_authorization_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "oauth_authorization_requests_client_id_idx"
  ON "oauth_authorization_requests"("client_id");
CREATE INDEX "oauth_authorization_requests_expires_at_idx"
  ON "oauth_authorization_requests"("expires_at");
CREATE INDEX "oauth_tokens_family_id_idx" ON "oauth_tokens"("family_id");

ALTER TABLE "oauth_authorization_requests"
  ADD CONSTRAINT "oauth_authorization_requests_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("client_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "oauth_auth_codes"
  ADD CONSTRAINT "oauth_auth_codes_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "orgs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "oauth_tokens"
  ADD CONSTRAINT "oauth_tokens_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "orgs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- The CLI is a public native client. Loopback ports are validated dynamically by the API.
INSERT INTO "oauth_clients" (
  "id", "client_id", "client_secret", "client_type", "name", "description",
  "redirect_uris", "grants", "scopes", "created_at", "updated_at"
) VALUES (
  gen_random_uuid(),
  'nove-cli',
  NULL,
  'PUBLIC',
  'Nove CLI',
  'Official Nove command line client',
  ARRAY['http://127.0.0.1/oauth/callback'],
  ARRAY['authorization_code', 'refresh_token'],
  ARRAY[
    'meeting:read', 'meeting:create', 'meeting:update', 'meeting:delete', 'meeting:stats_view',
    'minute:read', 'minute:delete',
    'speaker-summary:read', 'speaker-summary:create', 'speaker-summary:update', 'speaker-summary:delete',
    'tracking-report:read', 'tracking-report:create', 'tracking-report:update', 'tracking-report:delete',
    'user:read', 'user:create', 'user:update', 'user:delete'
  ],
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("client_id") DO UPDATE SET
  "client_secret" = NULL,
  "client_type" = 'PUBLIC',
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "redirect_uris" = EXCLUDED."redirect_uris",
  "grants" = EXCLUDED."grants",
  "scopes" = EXCLUDED."scopes",
  "updated_at" = CURRENT_TIMESTAMP;
