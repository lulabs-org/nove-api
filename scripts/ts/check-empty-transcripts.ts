/**
 * 运行命令 (在项目根目录下执行)：
 * npx ts-node scripts/ts/check-empty-transcripts.ts
 * 
 * 或者使用 tsx (推荐，速度更快):
 * npx tsx scripts/ts/check-empty-transcripts.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// 初始化 Prisma 客户端实例，用于与数据库进行交互
const prisma = new PrismaClient();

/**
 * 主函数：用于查询并导出数据库中缺少段落数据（TranscriptSegment）的转写记录（Transcript）。
 * 主要步骤：
 * 1. 查询所有符合条件的 Transcript。
 * 2. 如果存在记录，则将结果格式化并导出为 CSV 文件。
 */
async function main() {
  console.log('正在查询没有详细转写记录（TranscriptSegment）的 Transcript...');

  // 使用 Prisma 查询数据库中的 Transcript 表
  const allEmptyTranscripts = await prisma.transcript.findMany({
    where: {
      // 查询条件：segments 关联表（TranscriptSegment）中没有任何关联记录
      segments: {
        none: {}
      }
    },
    select: {
      // 仅选择需要的字段，减少内存占用和数据库传输压力
      id: true,             // 转写记录 ID
      source: true,         // 转写数据来源
      status: true,         // 转写状态
      createdAt: true,      // 创建时间
      recordingId: true,    // 关联的录音 ID
      recording: {
        // 级联查询：获取关联录音的 externalId
        select: {
          externalId: true  // 录音在外部系统（如腾讯会议）的 ID
        }
      }
    },
    orderBy: {
      // 按创建时间倒序排列，最新的记录排在前面
      createdAt: 'desc'
    }
  });

  console.log(`查询完成！一共有 ${allEmptyTranscripts.length} 条 Transcript 没有对应的 TranscriptSegment 记录。`);

  // 如果查询结果不为空，则开始生成 CSV 文件
  if (allEmptyTranscripts.length > 0) {
    // 1. 构造 CSV 的表头（首行）
    const headers = ['id', 'source', 'status', 'createdAt', 'recordingId', 'externalId'];
    const csvLines = [headers.join(',')];

    // 2. 遍历查询到的记录，逐行构造 CSV 数据
    for (const t of allEmptyTranscripts) {
      // 将单条记录的字段映射为一个数组
      const line = [
        t.id,
        t.source || '',                // 如果 source 为空则转为空字符串
        t.status,
        t.createdAt.toISOString(),     // 将日期格式化为 ISO 字符串以便在 CSV 中统一显示
        t.recordingId || '',           // 如果 recordingId 为空则转为空字符串
        t.recording?.externalId || ''  // 可选链处理 recording 和 externalId，为空则转为空字符串
      ].map(field => {
        // 将字段统一转换为字符串
        const str = String(field);
        // CSV 转义规则处理：如果字符串中包含逗号、双引号或换行符
        // 必须将其用双引号包裹，并将字符串本身包含的双引号替换为两个双引号 ("")
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(','); // 将各字段使用逗号拼接为一行数据

      // 将处理好的一行数据添加到数据集中
      csvLines.push(line);
    }

    // 3. 将所有的 CSV 行用换行符连接起来，形成最终的文件内容
    const csvContent = csvLines.join('\n');

    // 4. 定义输出文件的路径（当前工作目录下的 empty_transcripts.csv）
    const outputPath = path.join(process.cwd(), 'empty_transcripts.csv');

    // 5. 同步写入文件系统
    fs.writeFileSync(outputPath, csvContent, 'utf-8');

    console.log(`\n已成功将全部 ${allEmptyTranscripts.length} 条记录导出到 CSV 文件：`);
    console.log(outputPath);
  }
}

// 执行主函数
main()
  .catch((e) => {
    // 捕获并打印执行过程中的任何异常
    console.error('查询时发生错误:', e);
    // 以错误状态码 1 退出进程
    process.exit(1);
  })
  .finally(async () => {
    // 无论成功与否，最后务必断开 Prisma 客户端连接，释放数据库连接池资源
    await prisma.$disconnect();
  });
