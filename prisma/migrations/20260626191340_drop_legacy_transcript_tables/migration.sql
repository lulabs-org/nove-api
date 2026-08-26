/*
  Warnings:

  - You are about to drop the `transcript_paragraphs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transcript_sentences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transcript_words` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."transcript_paragraphs" DROP CONSTRAINT "transcript_paragraphs_speaker_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transcript_paragraphs" DROP CONSTRAINT "transcript_paragraphs_transcript_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transcript_sentences" DROP CONSTRAINT "transcript_sentences_paragraph_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transcript_words" DROP CONSTRAINT "transcript_words_sentence_id_fkey";

-- DropTable
DROP TABLE "public"."transcript_paragraphs";

-- DropTable
DROP TABLE "public"."transcript_sentences";

-- DropTable
DROP TABLE "public"."transcript_words";
