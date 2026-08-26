/*
  Warnings:

  - The primary key for the `oauth_auth_codes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `code` on the `oauth_auth_codes` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token` on the `oauth_tokens` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[refresh_token_hash]` on the table `oauth_tokens` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code_challenge` to the `oauth_auth_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code_hash` to the `oauth_auth_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `oauth_auth_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `family_id` to the `oauth_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `oauth_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refresh_token_hash` to the `oauth_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OAuthClientType" AS ENUM ('PUBLIC', 'CONFIDENTIAL');

-- DropIndex
DROP INDEX "public"."oauth_tokens_refresh_token_key";

-- AlterTable
ALTER TABLE "oauth_auth_codes" DROP CONSTRAINT "oauth_auth_codes_pkey",
DROP COLUMN "code",
ADD COLUMN     "code_challenge" TEXT NOT NULL,
ADD COLUMN     "code_challenge_method" TEXT NOT NULL DEFAULT 'S256',
ADD COLUMN     "code_hash" TEXT NOT NULL,
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD CONSTRAINT "oauth_auth_codes_pkey" PRIMARY KEY ("code_hash");

-- AlterTable
ALTER TABLE "oauth_clients" ADD COLUMN     "client_type" "OAuthClientType" NOT NULL DEFAULT 'CONFIDENTIAL',
ALTER COLUMN "client_secret" DROP NOT NULL;

-- AlterTable
ALTER TABLE "oauth_tokens" DROP COLUMN "refresh_token",
ADD COLUMN     "family_id" TEXT NOT NULL,
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD COLUMN     "refresh_token_hash" TEXT NOT NULL,
ADD COLUMN     "revoked_at" TIMESTAMPTZ(6),
ADD COLUMN     "rotated_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "oauth_authorization_requests" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "requested_scopes" TEXT[],
    "state" TEXT NOT NULL,
    "code_challenge" TEXT NOT NULL,
    "code_challenge_method" TEXT NOT NULL DEFAULT 'S256',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_authorization_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oauth_authorization_requests_client_id_idx" ON "oauth_authorization_requests"("client_id");

-- CreateIndex
CREATE INDEX "oauth_authorization_requests_expires_at_idx" ON "oauth_authorization_requests"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_tokens_refresh_token_hash_key" ON "oauth_tokens"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "oauth_tokens_family_id_idx" ON "oauth_tokens"("family_id");

-- AddForeignKey
ALTER TABLE "oauth_auth_codes" ADD CONSTRAINT "oauth_auth_codes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_authorization_requests" ADD CONSTRAINT "oauth_authorization_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;
