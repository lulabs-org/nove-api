/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the column `externalId` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the column `hostPlatformUserId` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the column `meetingCode` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the column `meetingId` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the column `subMeetingId` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the column `countryCode` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `lastSeenAt` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `phoneHash` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `platformData` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `platformUserId` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `userName` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[platform,meeting_id]` on the table `meetings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `meet_recording_files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `meeting_id` to the `meetings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `meetings` table without a default value. This is not possible if the table is not empty.
  - Made the column `metadata` on table `meetings` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `platform_user_id` to the `user_platforms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `user_platforms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "meet_participants" DROP CONSTRAINT "meet_participants_platformUserId_fkey";

-- DropForeignKey
ALTER TABLE "meetings" DROP CONSTRAINT "meetings_hostPlatformUserId_fkey";

-- DropForeignKey
ALTER TABLE "user_platforms" DROP CONSTRAINT "user_platforms_userId_fkey";

-- DropIndex
DROP INDEX "meetings_deletedAt_created_at_idx";

-- DropIndex
DROP INDEX "meetings_deletedAt_idx";

-- DropIndex
DROP INDEX "meetings_hostPlatformUserId_start_at_idx";

-- DropIndex
DROP INDEX "meetings_platform_meetingId_key";

-- DropIndex
DROP INDEX "user_platforms_isActive_idx";

-- DropIndex
DROP INDEX "user_platforms_lastSeenAt_idx";

-- DropIndex
DROP INDEX "user_platforms_phoneHash_idx";

-- DropIndex
DROP INDEX "user_platforms_platform_platformUserId_key";

-- DropIndex
DROP INDEX "user_platforms_userId_idx";

-- DropIndex
DROP INDEX "user_platforms_userName_idx";

-- DropIndex
DROP INDEX "users_active_deletedAt_idx";

-- DropIndex
DROP INDEX "users_deletedAt_idx";

-- DropIndex
DROP INDEX "users_lastLoginAt_idx";

-- AlterTable
ALTER TABLE "meet_participants" ALTER COLUMN "platformUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "meet_recording_files" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "meet_recordings" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "meetings" DROP COLUMN "deletedAt",
DROP COLUMN "externalId",
DROP COLUMN "hostPlatformUserId",
DROP COLUMN "meetingCode",
DROP COLUMN "meetingId",
DROP COLUMN "subMeetingId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "external_id" VARCHAR(100),
ADD COLUMN     "host_id" TEXT,
ADD COLUMN     "meeting_code" VARCHAR(50),
ADD COLUMN     "meeting_id" VARCHAR(100) NOT NULL,
ADD COLUMN     "sub_meeting_id" VARCHAR(100),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ALTER COLUMN "metadata" SET NOT NULL,
ALTER COLUMN "metadata" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "user_platforms" DROP COLUMN "countryCode",
DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "lastSeenAt",
DROP COLUMN "phoneHash",
DROP COLUMN "platformData",
DROP COLUMN "platformUserId",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
DROP COLUMN "userName",
ADD COLUMN     "country_code" TEXT,
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_seen_at" TIMESTAMPTZ(6),
ADD COLUMN     "phone_hash" TEXT,
ADD COLUMN     "platform_data" JSONB DEFAULT '{}',
ADD COLUMN     "platform_user_id" TEXT NOT NULL,
ADD COLUMN     "platform_uuid" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ADD COLUMN     "user_id" TEXT,
ADD COLUMN     "user_name" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "lastLoginAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "last_login_at" TIMESTAMPTZ(6),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- CreateIndex
CREATE INDEX "meetings_deleted_at_idx" ON "meetings"("deleted_at");

-- CreateIndex
CREATE INDEX "meetings_host_id_start_at_idx" ON "meetings"("host_id", "start_at");

-- CreateIndex
CREATE INDEX "meetings_created_by_id_start_at_idx" ON "meetings"("created_by_id", "start_at");

-- CreateIndex
CREATE INDEX "meetings_deleted_at_created_at_idx" ON "meetings"("deleted_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_platform_meeting_id_key" ON "meetings"("platform", "meeting_id");

-- CreateIndex
CREATE INDEX "idx_user_platforms_user_id" ON "user_platforms"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_platforms_phone_hash" ON "user_platforms"("phone_hash");

-- CreateIndex
CREATE INDEX "idx_user_platforms_user_name" ON "user_platforms"("user_name");

-- CreateIndex
CREATE INDEX "idx_user_platforms_is_active" ON "user_platforms"("is_active");

-- CreateIndex
CREATE INDEX "idx_user_platforms_last_seen_at" ON "user_platforms"("last_seen_at");

-- CreateIndex
CREATE INDEX "idx_user_platforms_platform_uuid" ON "user_platforms"("platform_uuid");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "users_last_login_at_idx" ON "users"("last_login_at");

-- CreateIndex
CREATE INDEX "users_active_deleted_at_idx" ON "users"("active", "deleted_at");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user_platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "user_platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meet_participants" ADD CONSTRAINT "meet_participants_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "user_platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_platforms" ADD CONSTRAINT "user_platforms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "user_platforms_email_idx" RENAME TO "idx_user_platforms_email";

-- RenameIndex
ALTER INDEX "user_platforms_platform_idx" RENAME TO "idx_user_platforms_platform";
