-- CreateEnum
CREATE TYPE "OrderSyncMode" AS ENUM ('HISTORY', 'INCREMENTAL');

-- CreateEnum
CREATE TYPE "OrderSyncTimeType" AS ENUM ('CREATE', 'UPDATE');

-- CreateEnum
CREATE TYPE "OrderSyncStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED');

-- CreateTable
CREATE TABLE "order_sync_jobs" (
    "id" TEXT NOT NULL,
    "mode" "OrderSyncMode" NOT NULL,
    "time_type" "OrderSyncTimeType" NOT NULL,
    "status" "OrderSyncStatus" NOT NULL DEFAULT 'PENDING',
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "current_start" TIMESTAMPTZ(6),
    "current_end" TIMESTAMPTZ(6),
    "next_key" TEXT,
    "page_size" INTEGER NOT NULL DEFAULT 100,
    "wx_status" INTEGER,
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "failed" JSONB,
    "last_error" TEXT,
    "bull_job_id" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_order_sync_jobs_mode_status" ON "order_sync_jobs"("mode", "status");

-- CreateIndex
CREATE INDEX "idx_order_sync_jobs_status_created_at" ON "order_sync_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_order_sync_jobs_time_range" ON "order_sync_jobs"("time_type", "start_time", "end_time");
