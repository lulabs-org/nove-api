-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "data" JSONB,
    "headers" JSONB,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "external_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_logs_provider_event_idx" ON "webhook_logs"("provider", "event");

-- CreateIndex
CREATE INDEX "webhook_logs_status_idx" ON "webhook_logs"("status");

-- CreateIndex
CREATE INDEX "webhook_logs_created_at_idx" ON "webhook_logs"("created_at");
