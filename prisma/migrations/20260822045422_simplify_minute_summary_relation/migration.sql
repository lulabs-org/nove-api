/*
  Warnings:

  - You are about to drop the column `is_latest` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `minute_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `is_latest` on the `speaker_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `speaker_summaries` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[minute_id]` on the table `minute_summaries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[minute_id,platform_user_id]` on the table `speaker_summaries` will be added. If there are existing duplicate values, this will fail.

*/
-- Deduplicate minute_summaries (keep newest created_at)
DELETE FROM "minute_summaries"
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY minute_id ORDER BY created_at DESC) AS row_num
    FROM "minute_summaries"
  ) t
  WHERE t.row_num > 1
);

-- Deduplicate speaker_summaries (keep newest created_at)
DELETE FROM "speaker_summaries"
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY minute_id, platform_user_id ORDER BY created_at DESC) AS row_num
    FROM "speaker_summaries"
  ) t
  WHERE t.row_num > 1
);

-- DropIndex
DROP INDEX IF EXISTS "public"."uq_minute_summary_version";

-- DropIndex
DROP INDEX IF EXISTS "public"."speaker_summaries_minute_id_platform_user_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."uq_speaker_summary_version";

-- AlterTable
ALTER TABLE "minute_summaries" DROP COLUMN IF EXISTS "is_latest",
DROP COLUMN IF EXISTS "version";

-- AlterTable
ALTER TABLE "speaker_summaries" DROP COLUMN IF EXISTS "is_latest",
DROP COLUMN IF EXISTS "version";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "minute_summaries_minute_id_key" ON "minute_summaries"("minute_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_speaker_summary" ON "speaker_summaries"("minute_id", "platform_user_id");
