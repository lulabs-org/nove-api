import { Injectable } from '@nestjs/common';
import { Platform, PlatformUser } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { NewTranscriptParagraph } from '@/tencent-mtg/types';

/**
 * 腾讯会议转录文本批量处理器
 * 负责将腾讯会议返回的原始转录数据（段落、句子、词汇）分批次高效地持久化到数据库中。
 * 同时处理发言人（PlatformUser）的同步，并保存至新表（TranscriptSegment）中。
 */
@Injectable()
export class TranscriptSyncService {
  private readonly PARAGRAPH_BATCH_SIZE = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ptUserRepo: PlatformUserRepository,
  ) {}

  /**
   * 分批次处理转录文本段落数据
   * 将庞大的段落数组按 `PARAGRAPH_BATCH_SIZE` 切分，逐批进行事务插入以避免内存或数据库事务超载。
   *
   * @param paragraphs 腾讯会议接口返回的原始段落数组
   * @param transcriptId 关联的转录文本(Transcript)记录ID
   */
  async sync(
    paragraphs: NewTranscriptParagraph[],
    transcriptId: string,
  ): Promise<void> {
    for (let i = 0; i < paragraphs.length; i += this.PARAGRAPH_BATCH_SIZE) {
      const batch = paragraphs.slice(i, i + this.PARAGRAPH_BATCH_SIZE);

      await this.prisma.$transaction(async (tx) => {
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
}
