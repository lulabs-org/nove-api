/*
  Warnings:

  - You are about to drop the column `created_at` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `user_platforms` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `user_platforms` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "meet_participants" DROP CONSTRAINT "meet_participants_platformUserId_fkey";

-- DropForeignKey
ALTER TABLE "meet_recordings" DROP CONSTRAINT "meet_recordings_recorder_user_id_fkey";

-- DropForeignKey
ALTER TABLE "meet_summaries" DROP CONSTRAINT "meet_summaries_approved_id_fkey";

-- DropForeignKey
ALTER TABLE "meet_user_actions" DROP CONSTRAINT "meet_user_actions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "meetings" DROP CONSTRAINT "meetings_created_by_id_fkey";

-- DropIndex
DROP INDEX "idx_email_platform";

-- DropIndex
DROP INDEX "idx_local_user_active";

-- DropIndex
DROP INDEX "idx_phone_platform";

-- DropIndex
DROP INDEX "idx_platform_active";

-- DropIndex
DROP INDEX "user_platforms_platform_pt_union_id_key";

-- AlterTable
ALTER TABLE "user_platforms" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "last_seen_at" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "user_platforms_phone_hash_idx" ON "user_platforms"("phone_hash");

-- CreateIndex
CREATE INDEX "user_platforms_platform_idx" ON "user_platforms"("platform");
