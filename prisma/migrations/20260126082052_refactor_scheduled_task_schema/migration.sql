/*
  Warnings:

  - You are about to drop the column `createdAt` on the `scheduled_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `jobId` on the `scheduled_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `lastError` on the `scheduled_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `queueName` on the `scheduled_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `repeatKey` on the `scheduled_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `runAt` on the `scheduled_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `scheduled_tasks` table. All the data in the column will be lost.
  - Added the required column `queue_name` to the `scheduled_tasks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `scheduled_tasks` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."scheduled_tasks_queueName_idx";

-- AlterTable
ALTER TABLE "scheduled_tasks" DROP COLUMN "createdAt",
DROP COLUMN "jobId",
DROP COLUMN "lastError",
DROP COLUMN "queueName",
DROP COLUMN "repeatKey",
DROP COLUMN "runAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "job_id" TEXT,
ADD COLUMN     "last_error" TEXT,
ADD COLUMN     "queue_name" TEXT NOT NULL,
ADD COLUMN     "repeat_key" TEXT,
ADD COLUMN     "run_at" TIMESTAMPTZ(6),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- CreateIndex
CREATE INDEX "scheduled_tasks_queue_name_idx" ON "scheduled_tasks"("queue_name");
