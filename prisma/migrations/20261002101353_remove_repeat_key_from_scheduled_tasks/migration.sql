/*
  Warnings:

  - You are about to drop the column `repeat_key` on the `scheduled_tasks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "scheduled_tasks" DROP COLUMN "repeat_key";
