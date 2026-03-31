/*
  Warnings:

  - You are about to drop the column `endTimeMs` on the `transcript_paragraphs` table. All the data in the column will be lost.
  - You are about to drop the column `speakerId` on the `transcript_paragraphs` table. All the data in the column will be lost.
  - You are about to drop the column `startTimeMs` on the `transcript_paragraphs` table. All the data in the column will be lost.
  - You are about to drop the column `transcriptId` on the `transcript_paragraphs` table. All the data in the column will be lost.
  - You are about to drop the column `endTimeMs` on the `transcript_sentences` table. All the data in the column will be lost.
  - You are about to drop the column `paragraphId` on the `transcript_sentences` table. All the data in the column will be lost.
  - You are about to drop the column `startTimeMs` on the `transcript_sentences` table. All the data in the column will be lost.
  - You are about to drop the column `endTimeMs` on the `transcript_words` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `transcript_words` table. All the data in the column will be lost.
  - You are about to drop the column `sentenceId` on the `transcript_words` table. All the data in the column will be lost.
  - You are about to drop the column `startTimeMs` on the `transcript_words` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[transcript_id,pid]` on the table `transcript_paragraphs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paragraph_id,sid]` on the table `transcript_sentences` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sentence_id,wid]` on the table `transcript_words` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `end_time_ms` to the `transcript_paragraphs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time_ms` to the `transcript_paragraphs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transcript_id` to the `transcript_paragraphs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `transcript_paragraphs` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `pid` on the `transcript_paragraphs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `end_time_ms` to the `transcript_sentences` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paragraph_id` to the `transcript_sentences` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time_ms` to the `transcript_sentences` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `transcript_sentences` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `sid` on the `transcript_sentences` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `end_time_ms` to the `transcript_words` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sentence_id` to the `transcript_words` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time_ms` to the `transcript_words` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `transcript_words` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `wid` on the `transcript_words` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updated_at` to the `transcripts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."transcript_paragraphs" DROP CONSTRAINT "transcript_paragraphs_speakerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."transcript_paragraphs" DROP CONSTRAINT "transcript_paragraphs_transcriptId_fkey";

-- DropForeignKey
ALTER TABLE "public"."transcript_sentences" DROP CONSTRAINT "transcript_sentences_paragraphId_fkey";

-- DropForeignKey
ALTER TABLE "public"."transcript_words" DROP CONSTRAINT "transcript_words_sentenceId_fkey";

-- DropIndex
DROP INDEX "public"."transcript_paragraphs_speakerId_idx";

-- DropIndex
DROP INDEX "public"."transcript_paragraphs_transcriptId_pid_key";

-- DropIndex
DROP INDEX "public"."transcript_paragraphs_transcriptId_startTimeMs_idx";

-- DropIndex
DROP INDEX "public"."transcript_sentences_paragraphId_sid_key";

-- DropIndex
DROP INDEX "public"."transcript_sentences_startTimeMs_idx";

-- DropIndex
DROP INDEX "public"."transcript_words_sentenceId_order_key";

-- DropIndex
DROP INDEX "public"."transcript_words_sentenceId_wid_key";

-- AlterTable
ALTER TABLE "transcript_paragraphs" DROP COLUMN "endTimeMs",
DROP COLUMN "speakerId",
DROP COLUMN "startTimeMs",
DROP COLUMN "transcriptId",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "end_time_ms" BIGINT NOT NULL,
ADD COLUMN     "speaker_id" TEXT,
ADD COLUMN     "start_time_ms" BIGINT NOT NULL,
ADD COLUMN     "transcript_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
DROP COLUMN "pid",
ADD COLUMN     "pid" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "transcript_sentences" DROP COLUMN "endTimeMs",
DROP COLUMN "paragraphId",
DROP COLUMN "startTimeMs",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "end_time_ms" BIGINT NOT NULL,
ADD COLUMN     "paragraph_id" TEXT NOT NULL,
ADD COLUMN     "start_time_ms" BIGINT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
DROP COLUMN "sid",
ADD COLUMN     "sid" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "transcript_words" DROP COLUMN "endTimeMs",
DROP COLUMN "order",
DROP COLUMN "sentenceId",
DROP COLUMN "startTimeMs",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "end_time_ms" BIGINT NOT NULL,
ADD COLUMN     "sentence_id" TEXT NOT NULL,
ADD COLUMN     "start_time_ms" BIGINT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
DROP COLUMN "wid",
ADD COLUMN     "wid" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "transcripts" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- CreateIndex
CREATE INDEX "transcript_paragraphs_transcript_id_start_time_ms_idx" ON "transcript_paragraphs"("transcript_id", "start_time_ms");

-- CreateIndex
CREATE INDEX "transcript_paragraphs_speaker_id_idx" ON "transcript_paragraphs"("speaker_id");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_paragraphs_transcript_id_pid_key" ON "transcript_paragraphs"("transcript_id", "pid");

-- CreateIndex
CREATE INDEX "transcript_sentences_start_time_ms_idx" ON "transcript_sentences"("start_time_ms");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_sentences_paragraph_id_sid_key" ON "transcript_sentences"("paragraph_id", "sid");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_words_sentence_id_wid_key" ON "transcript_words"("sentence_id", "wid");

-- AddForeignKey
ALTER TABLE "transcript_paragraphs" ADD CONSTRAINT "transcript_paragraphs_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "user_platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_paragraphs" ADD CONSTRAINT "transcript_paragraphs_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_sentences" ADD CONSTRAINT "transcript_sentences_paragraph_id_fkey" FOREIGN KEY ("paragraph_id") REFERENCES "transcript_paragraphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_words" ADD CONSTRAINT "transcript_words_sentence_id_fkey" FOREIGN KEY ("sentence_id") REFERENCES "transcript_sentences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
