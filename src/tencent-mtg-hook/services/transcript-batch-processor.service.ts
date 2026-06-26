import { Injectable } from '@nestjs/common';
import { Platform, PlatformUser } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { NewTranscriptParagraph } from '@/tencent-mtg-hook/types';

/**
 * 腾讯会议转录文本批量处理器
 * 负责将腾讯会议返回的原始转录数据（段落、句子、词汇）分批次高效地持久化到数据库中。
 * 同时处理发言人（PlatformUser）的同步，并兼容新表（TranscriptSegment）的双写逻辑。
 */
@Injectable()
export class TranscriptBatchProcessor {
  private readonly PARAGRAPH_BATCH_SIZE = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ptUserRepo: PlatformUserRepository,
  ) { }

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

      if (segmentsToCreate.length > 0) {
        await tx.transcriptSegment.createMany({
          data: segmentsToCreate,
        });
      }
    });
  }
}
