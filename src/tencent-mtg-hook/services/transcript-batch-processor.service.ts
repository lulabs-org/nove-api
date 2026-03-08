import { Injectable } from '@nestjs/common';
import { Platform, PlatformUser } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import {
  ParagraphRepository,
  SentenceRepository,
  WordRepository,
} from '@/tencent-mtg-hook/repositories';
import {
  PrismaTransaction,
  NewRecordingTranscriptParagraph,
  ParagraphData,
  SentenceData,
} from '@/tencent-mtg-hook/types';

@Injectable()
export class TranscriptBatchProcessor {
  private readonly PARAGRAPH_BATCH_SIZE = 15;
  private readonly SENTENCE_BATCH_SIZE = 75;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paragraphRepository: ParagraphRepository,
    private readonly sentenceRepository: SentenceRepository,
    private readonly wordRepository: WordRepository,
    private readonly ptUserRepository: PlatformUserRepository,
  ) {}

  async processParagraphsInBatches(
    paragraphs: NewRecordingTranscriptParagraph[],
    transcriptId: string,
  ): Promise<void> {
    for (let i = 0; i < paragraphs.length; i += this.PARAGRAPH_BATCH_SIZE) {
      const batch = paragraphs.slice(i, i + this.PARAGRAPH_BATCH_SIZE);
      await this.processParagraphBatch(batch, transcriptId);
    }
  }

  private async processParagraphBatch(
    batch: NewRecordingTranscriptParagraph[],
    transcriptId: string,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const paragraphDataList: Array<ParagraphData> = [];

      for (const paragraph of batch) {
        const speakerInfo = paragraph.speaker_info;
        const ptUnionId = speakerInfo.uuid;

        let platformUser: PlatformUser | null = null;
        if (ptUnionId) {
          platformUser = await this.ptUserRepository.upsert(
            { platform: Platform.TENCENT_MEETING, ptUnionId },
            {
              displayName: speakerInfo.username,
              ptUserId: speakerInfo.userid,
              phoneHash: speakerInfo.phone,
            },
          );
        }

        const speakerId = platformUser?.id;

        const createdParagraph = await this.paragraphRepository.create(tx, {
          pid: parseInt(paragraph.pid, 10),
          startTimeMs: BigInt(paragraph.start_time),
          endTimeMs: BigInt(paragraph.end_time),
          speakerId,
          transcriptId,
        });

        paragraphDataList.push({
          paragraph,
          index: createdParagraph.id,
        });
      }

      await this.processSentencesAndWordsInBatches(paragraphDataList, tx);
    });
  }

  private async processSentencesAndWordsInBatches(
    paragraphDataList: Array<ParagraphData>,
    tx: PrismaTransaction,
  ): Promise<void> {
    const allSentences: Array<SentenceData> = [];

    for (const paragraphData of paragraphDataList) {
      for (const sentence of paragraphData.paragraph.sentences) {
        allSentences.push({
          sentence,
          paragraphId: paragraphData.index,
        });
      }
    }

    for (let i = 0; i < allSentences.length; i += this.SENTENCE_BATCH_SIZE) {
      const batch = allSentences.slice(i, i + this.SENTENCE_BATCH_SIZE);
      await this.processSentenceAndWordBatch(batch, tx);
    }
  }

  private async processSentenceAndWordBatch(
    batch: Array<SentenceData>,
    tx: PrismaTransaction,
  ): Promise<void> {
    for (const sentenceData of batch) {
      const createdSentence = await this.sentenceRepository.create(tx, {
        sid: parseInt(sentenceData.sentence.sid, 10),
        startTimeMs: BigInt(sentenceData.sentence.start_time),
        endTimeMs: BigInt(sentenceData.sentence.end_time),
        paragraphId: sentenceData.paragraphId,
        text: sentenceData.sentence.words.map((w) => w.text).join(''),
      });

      const words = sentenceData.sentence.words.map((word) => ({
        wid: parseInt(word.wid, 10),
        startTimeMs: BigInt(word.start_time),
        endTimeMs: BigInt(word.end_time),
        text: word.text,
        sentenceId: createdSentence.id,
      }));

      await this.wordRepository.createMany(tx, words);
    }
  }
}
