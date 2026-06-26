/**
 * @file migrate-transcript-segments.ts
 * @description 会议字幕数据结构简化迁移脚本 (One-off Migration Script)
 * 
 * 【背景】
 * 随着业务的发展和系统优化的需求，我们需要将原来拆散在 `Paragraph`、`Sentence`、`Word` 
 * 三个表中的复杂多层级字幕数据，迁移到以“一句话”为基础粒度的新表 `TranscriptSegment` 中。
 * 词级别的详细对齐数据将以 JSONB 格式统一存入 `wordsDetail` 字段。这能有效减少海量数据
 * 带来的数据库记录数膨胀，并提升查询性能。
 * 
 * 【前提条件】
 * 1. 已在 Prisma Schema 中新建了 `TranscriptSegment` 表。
 * 2. 已经运行过 `pnpm db:generate` 及 `pnpm db:push` / `pnpm db:migrate` 将表结构同步到了数据库。
 * 
 * 【执行方式】
 * 在项目根目录下通过 tsx 运行（会自动读取你根目录的 .env 文件）：
 * $ npx tsx scripts/ts/migrate-transcript-segments.ts
 * 
 * 【安全性保证】
 * 脚本采用了 `createMany` 并开启 `skipDuplicates: true` 的幂等设计。
 * 为了确保数据不被重复插入，脚本复用了原 `Sentence` 的 `id` 作为新 `TranscriptSegment` 的 `id`。
 * 这意味着脚本可以随时中断并安全重复执行，不会产生脏数据。
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始数据迁移：从 Paragraph/Sentence/Word 到 TranscriptSegment...');

  // 获取所有包含 Paragraph 的 Transcript
  const transcripts = await (prisma as any).transcript.findMany({
    where: {
      paragraphs: {
        some: {},
      },
    },
    select: { id: true },
  });

  console.log(`共找到 ${transcripts.length} 个需要迁移的 Transcript 记录。`);

  let totalMigratedSegments = 0;

  for (const { id: transcriptId } of transcripts) {
    console.log(`⏳ 正在处理 transcript: ${transcriptId}`);

    // 获取当前 transcript 下的所有 paragraphs，关联 user (获取 speakerName), sentences 以及 words
    const paragraphs = await (prisma as any).paragraph.findMany({
      where: { transcriptId },
      include: {
        speaker: {
          select: { displayName: true },
        },
        sentences: {
          include: {
            words: {
              orderBy: { wid: 'asc' },
            },
          },
          orderBy: { sid: 'asc' },
        },
      },
      orderBy: { pid: 'asc' },
    });

    let migratedSegmentsCount = 0;
    const allSegmentsForTranscript: any[] = [];

    for (const paragraph of paragraphs) {
      // 遍历每句话，将其映射为新表的 Segment
      const segmentsToCreate = paragraph.sentences.map((sentence) => {
        // 如果 sentence.text 为空，则通过 word.text 拼接
        const text = sentence.text || sentence.words.map((w) => w.text).join('');

        // 构造 words_detail JSON 格式
        const wordsDetail = sentence.words.map((w) => ({
          word: w.text,
          start: Number(w.startTimeMs), // 保持使用毫秒
          end: Number(w.endTimeMs),
        }));

        return {
          id: sentence.id, // 复用原句子的 ID 以保证幂等性
          transcriptId: paragraph.transcriptId,
          speakerId: paragraph.speakerId,
          speakerName: paragraph.speaker?.displayName || null,
          startTimeMs: sentence.startTimeMs,
          endTimeMs: sentence.endTimeMs,
          text: text,
          confidence: null, // 旧表没有此数据
          wordsDetail: wordsDetail,
          createdAt: sentence.createdAt,
          updatedAt: sentence.updatedAt,
          deletedAt: sentence.deletedAt,
        };
      });

      allSegmentsForTranscript.push(...segmentsToCreate);
    }
    
    if (allSegmentsForTranscript.length > 0) {
      // 批量插入当前 Transcript 下的所有 Segment（大幅减少数据库交互次数）
      await prisma.transcriptSegment.createMany({
        data: allSegmentsForTranscript,
        skipDuplicates: true, // 避免重复迁移
      });
      migratedSegmentsCount += allSegmentsForTranscript.length;
    }

    console.log(`✅ Transcript ${transcriptId}: 成功迁移 ${migratedSegmentsCount} 条句子 (Segment) 数据。`);
    totalMigratedSegments += migratedSegmentsCount;
  }

  console.log(`🎉 迁移完成！共计迁移了 ${totalMigratedSegments} 条数据。`);
}

main()
  .catch((e) => {
    console.error('❌ 迁移失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
