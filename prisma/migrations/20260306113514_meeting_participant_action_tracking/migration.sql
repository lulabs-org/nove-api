/*
  Warnings:

  - You are about to drop the column `createdAt` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `durationSeconds` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `instanceId` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `joinTime` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `leftTime` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `meetingId` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `platformUserId` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `sessionData` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `userRole` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `meet_user_actions` table. All the data in the column will be lost.
  - Added the required column `meeting_id` to the `meet_participants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `meet_participants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `action_at` to the `meet_user_actions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `meeting_id` to the `meet_user_actions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `meet_user_actions` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `action` on the `meet_user_actions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MeetingControlAction" AS ENUM ('MUTE_ALL', 'UNMUTE_ALL', 'START_SCREEN_SHARE', 'STOP_SCREEN_SHARE', 'MUTE_PARTICIPANT', 'UNMUTE_PARTICIPANT', 'REMOVE_PARTICIPANT', 'LOCK_MEETING', 'UNLOCK_MEETING', 'START_RECORDING', 'STOP_RECORDING', 'START_WHITEBOARD', 'STOP_WHITEBOARD', 'START_POLL', 'STOP_POLL', 'START_BREAKOUT_ROOM', 'STOP_BREAKOUT_ROOM', 'RAISE_HAND', 'LOWER_HAND', 'START_CHAT', 'STOP_CHAT', 'START_REACTION', 'STOP_REACTION');

-- DropForeignKey
ALTER TABLE "public"."meet_participants" DROP CONSTRAINT "meet_participants_meetingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."meet_participants" DROP CONSTRAINT "meet_participants_platformUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."meet_user_actions" DROP CONSTRAINT "meet_user_actions_user_id_fkey";

-- DropIndex
DROP INDEX "public"."meet_participants_meetingId_idx";

-- DropIndex
DROP INDEX "public"."meet_participants_platformUserId_idx";

-- DropIndex
DROP INDEX "public"."idx_actions_user_time";

-- AlterTable
ALTER TABLE "meet_participants" DROP COLUMN "createdAt",
DROP COLUMN "durationSeconds",
DROP COLUMN "instanceId",
DROP COLUMN "joinTime",
DROP COLUMN "leftTime",
DROP COLUMN "meetingId",
DROP COLUMN "platformUserId",
DROP COLUMN "sessionData",
DROP COLUMN "updatedAt",
DROP COLUMN "userRole",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "duration_seconds" INTEGER,
ADD COLUMN     "instance_id" INTEGER,
ADD COLUMN     "join_time" TIMESTAMPTZ(6),
ADD COLUMN     "left_time" TIMESTAMPTZ(6),
ADD COLUMN     "meeting_id" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "pt_user_id" TEXT,
ADD COLUMN     "session_data" JSONB,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ADD COLUMN     "user_role" INTEGER;

-- AlterTable
ALTER TABLE "meet_user_actions" DROP COLUMN "user_id",
ADD COLUMN     "action_at" TIMESTAMPTZ(6) NOT NULL,
ADD COLUMN     "meeting_id" TEXT NOT NULL,
ADD COLUMN     "pt_user_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
DROP COLUMN "action",
ADD COLUMN     "action" "MeetingControlAction" NOT NULL;

-- CreateIndex
CREATE INDEX "meet_participants_meeting_id_idx" ON "meet_participants"("meeting_id");

-- CreateIndex
CREATE INDEX "meet_participants_pt_user_id_idx" ON "meet_participants"("pt_user_id");

-- CreateIndex
CREATE INDEX "meet_participants_join_time_idx" ON "meet_participants"("join_time");

-- CreateIndex
CREATE INDEX "meet_participants_left_time_idx" ON "meet_participants"("left_time");

-- CreateIndex
CREATE INDEX "meet_participants_deleted_at_idx" ON "meet_participants"("deleted_at");

-- CreateIndex
CREATE INDEX "meet_participants_meeting_id_pt_user_id_idx" ON "meet_participants"("meeting_id", "pt_user_id");

-- CreateIndex
CREATE INDEX "meet_participants_meeting_id_join_time_idx" ON "meet_participants"("meeting_id", "join_time");

-- CreateIndex
CREATE INDEX "meet_participants_meeting_id_deleted_at_idx" ON "meet_participants"("meeting_id", "deleted_at");

-- CreateIndex
CREATE INDEX "meet_participants_pt_user_id_join_time_idx" ON "meet_participants"("pt_user_id", "join_time");

-- CreateIndex
CREATE INDEX "idx_actions_user_time" ON "meet_user_actions"("pt_user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_actions_meeting_time" ON "meet_user_actions"("meeting_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_actions_meeting_action_time" ON "meet_user_actions"("meeting_id", "action_at");

-- AddForeignKey
ALTER TABLE "meet_participants" ADD CONSTRAINT "meet_participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meet_participants" ADD CONSTRAINT "meet_participants_pt_user_id_fkey" FOREIGN KEY ("pt_user_id") REFERENCES "user_platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meet_user_actions" ADD CONSTRAINT "meet_user_actions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meet_user_actions" ADD CONSTRAINT "meet_user_actions_pt_user_id_fkey" FOREIGN KEY ("pt_user_id") REFERENCES "user_platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
