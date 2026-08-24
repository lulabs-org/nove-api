/*
  Warnings:

  - You are about to drop the column `processing_status` on the `minutes` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `minutes` table. All the data in the column will be lost.

*/
-- Preserve the only status that cannot be derived from related resources.
ALTER TABLE "minutes" ADD COLUMN "error_message" TEXT;

UPDATE "minutes"
SET "error_message" = 'Recording failed before status migration'
WHERE "status" = 'FAILED';

-- AlterTable
ALTER TABLE "minutes" DROP COLUMN "processing_status",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "public"."ProcessingStatus";

-- DropEnum
DROP TYPE "public"."RecordingStatus";
