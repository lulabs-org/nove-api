/*
  Warnings:

  - You are about to drop the column `rawJson` on the `transcripts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transcripts" DROP COLUMN "rawJson",
ADD COLUMN     "raw_file_url" TEXT;
