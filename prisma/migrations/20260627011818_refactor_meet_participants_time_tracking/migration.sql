/*
  Warnings:

  - You are about to drop the column `duration_seconds` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `instance_id` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `join_time` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `left_time` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `session_data` on the `meet_participants` table. All the data in the column will be lost.
  - You are about to drop the column `user_role` on the `meet_participants` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MeetingControlAction" ADD VALUE 'JOIN_MEETING';
ALTER TYPE "MeetingControlAction" ADD VALUE 'LEAVE_MEETING';

-- DropIndex
DROP INDEX "public"."meet_participants_join_time_idx";

-- DropIndex
DROP INDEX "public"."meet_participants_left_time_idx";

-- DropIndex
DROP INDEX "public"."meet_participants_meeting_id_join_time_idx";

-- DropIndex
DROP INDEX "public"."meet_participants_pt_user_id_join_time_idx";

-- AlterTable
ALTER TABLE "meet_participants" DROP COLUMN "duration_seconds",
DROP COLUMN "instance_id",
DROP COLUMN "join_time",
DROP COLUMN "left_time",
DROP COLUMN "session_data",
DROP COLUMN "user_role",
ADD COLUMN     "first_join_time" TIMESTAMPTZ(6),
ADD COLUMN     "last_leave_time" TIMESTAMPTZ(6),
ADD COLUMN     "total_duration_seconds" INTEGER;

-- CreateIndex
CREATE INDEX "meet_participants_first_join_time_idx" ON "meet_participants"("first_join_time");

-- CreateIndex
CREATE INDEX "meet_participants_last_leave_time_idx" ON "meet_participants"("last_leave_time");

-- CreateIndex
CREATE INDEX "meet_participants_meeting_id_first_join_time_idx" ON "meet_participants"("meeting_id", "first_join_time");

-- CreateIndex
CREATE INDEX "meet_participants_pt_user_id_first_join_time_idx" ON "meet_participants"("pt_user_id", "first_join_time");
