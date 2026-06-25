import { Injectable } from '@nestjs/common';
import { Platform, PlatformUser } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import {
  ParagraphRepository,
  SentenceRepository,
  WordRepository,
} from '@/meeting/repositories';
import {
  PrismaTransaction,
  NewTranscriptParagraph,
  ParagraphData,
  SentenceData,
} from '@/tencent-mtg-hook/types';

/**
 * 腾讯会议转录文本批量处理器
 * 负责将腾讯会议返回的原始转录数据（段落、句子、词汇）分批次高效地持久化到数据库中。
 * 同时处理发言人（PlatformUser）的同步，并兼容新表（TranscriptSegment）的双写逻辑。
 */
@Injectable()
export class TranscriptBatchProcessor {
  private readonly PARAGRAPH_BATCH_SIZE = 15;
  private readonly SENTENCE_BATCH_SIZE = 75;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paraRepo: ParagraphRepository,
    private readonly sentRepo: SentenceRepository,
    private readonly wordRepo: WordRepository,
    private readonly ptUserRepo: PlatformUserRepository,
  ) {}

  /**
   * 分批次处理转录文本段落数据
   * 将庞大的段落数组按 `PARAGRAPH_BATCH_SIZE` 切分，逐批进行事务插入以避免内存或数据库事务超载。
   *
   * @param paragraphs 腾讯会议接口返回的原始段落数组
   * @param transcriptId 关联的转录文本(Transcript)记录ID
   */
  async processParagraphs(
    paragraphs: NewTranscriptParagraph[],
    transcriptId: string,
  ): Promise<void> {
    for (let i = 0; i < paragraphs.length; i += this.PARAGRAPH_BATCH_SIZE) {
      const batch = paragraphs.slice(i, i + this.PARAGRAPH_BATCH_SIZE);
      await this.processBatch(batch, transcriptId);
    }
  }

  /**
   * 在单个数据库事务中处理一批转录文本段落
   * 包含：
   * 1. 发言人（PlatformUser）信息的按需创建/更新
   * 2. 旧表结构（Paragraph, Sentence, Word）的级联插入
   * 3. 新表结构（TranscriptSegment）的双写组装与批量插入
   *
   * @param batch 一批需要处理的段落数据
   * @param transcriptId 关联的转录文本记录ID
   */
  private async processBatch(
    batch: NewTranscriptParagraph[],
    transcriptId: string,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const paragraphDataList: Array<ParagraphData> = [];
      const segmentsToCreate: any[] = [];

      for (const paragraph of batch) {
        const speakerInfo = paragraph.speaker_info;
        const ptUnionId = speakerInfo.uuid;

        let platformUser: PlatformUser | null = null;
        if (ptUnionId) {
          platformUser = await this.ptUserRepo.upsert(
            { platform: Platform.TENCENT_MEETING, ptUnionId },
            {
              displayName: speakerInfo.username,
              ptUserId: speakerInfo.userid,
              phoneHash: speakerInfo.phone,
            },
          );
        }

        const speakerId = platformUser?.id;

        const createdParagraph = await this.paraRepo.create(tx, {
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

        // --------------------------------------------------
        // 新表双写逻辑：在同一个事务中组装并插入 TranscriptSegment
        // --------------------------------------------------
        for (const sentence of paragraph.sentences) {
          const text = sentence.words.map((w) => w.text).join('');
          const wordsDetail = sentence.words.map((w) => ({
            word: w.text,
            start: Number(w.start_time),
            end: Number(w.end_time),
          }));

          segmentsToCreate.push({
            transcriptId,
            speakerId,
            speakerName: speakerInfo.username || null,
            startTimeMs: BigInt(sentence.start_time),
            endTimeMs: BigInt(sentence.end_time),
            text,
            confidence: null,
            wordsDetail,
          });
        }
      }

      await this.processSentences(paragraphDataList, tx);

      if (segmentsToCreate.length > 0) {
        await tx.transcriptSegment.createMany({
          data: segmentsToCreate,
        });
      }
    });
  }

  /**
   * 提取并分批次处理当前段落批次中的所有句子数据
   * 将嵌套的句子数据展平，并按 `SENTENCE_BATCH_SIZE` 进行分批事务入库。
   *
   * @param paragraphDataList 包含原始段落结构和已入库段落ID的映射列表
   * @param tx Prisma 事务客户端
   */
  private async processSentences(
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
      await this.processSentenceBatch(batch, tx);
    }
  }

  /**
   * 处理并插入单批次的句子（Sentence）及其关联的词汇（Word）数据
   *
   * @param batch 一批平铺开的句子数据（包含所属段落ID）
   * @param tx Prisma 事务客户端
   */
  private async processSentenceBatch(
    batch: Array<SentenceData>,
    tx: PrismaTransaction,
  ): Promise<void> {
    for (const sentenceData of batch) {
      const createdSentence = await this.sentRepo.create(tx, {
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

      await this.wordRepo.createMany(tx, words);
    }
  }
}
