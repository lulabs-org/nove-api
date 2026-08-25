-- CreateEnum
CREATE TYPE "OAuthClientStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- AlterTable
ALTER TABLE "oauth_clients" ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "credential_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "disabled_at" TIMESTAMPTZ(6),
ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "OAuthClientStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "oauth_delegatable" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "oauth_client_audit_logs" (
    "id" TEXT NOT NULL,
    "oauth_client_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_client_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oauth_client_audit_logs_oauth_client_id_created_at_idx" ON "oauth_client_audit_logs"("oauth_client_id", "created_at");

-- CreateIndex
CREATE INDEX "oauth_client_audit_logs_actor_user_id_idx" ON "oauth_client_audit_logs"("actor_user_id");

-- AddForeignKey
ALTER TABLE "oauth_clients" ADD CONSTRAINT "oauth_clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_clients" ADD CONSTRAINT "oauth_clients_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_client_audit_logs" ADD CONSTRAINT "oauth_client_audit_logs_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_client_audit_logs" ADD CONSTRAINT "oauth_client_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
