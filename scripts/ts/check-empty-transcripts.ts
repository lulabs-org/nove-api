import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('正在查询没有详细转写记录（TranscriptSegment）的 Transcript...');
  
  const allEmptyTranscripts = await prisma.transcript.findMany({
    where: {
      segments: {
        none: {}
      }
    },
    select: {
      id: true,
      source: true,
      status: true,
      createdAt: true,
      recordingId: true,
      recording: {
        select: {
          externalId: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`查询完成！一共有 ${allEmptyTranscripts.length} 条 Transcript 没有对应的 TranscriptSegment 记录。`);
  
  if (allEmptyTranscripts.length > 0) {
    // 构造 CSV 内容
    const headers = ['id', 'source', 'status', 'createdAt', 'recordingId', 'externalId'];
    const csvLines = [headers.join(',')];
    
    for (const t of allEmptyTranscripts) {
      const line = [
        t.id,
        t.source || '',
        t.status,
        t.createdAt.toISOString(),
        t.recordingId || '',
        t.recording?.externalId || ''
      ].map(field => {
        const str = String(field);
        // 如果包含逗号、双引号或换行符，需要用双引号包围并转义内部的双引号
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
      csvLines.push(line);
    }
    
    const csvContent = csvLines.join('\n');
    const outputPath = path.join(process.cwd(), 'empty_transcripts.csv');
    
    fs.writeFileSync(outputPath, csvContent, 'utf-8');
    
    console.log(`\n已成功将全部 ${allEmptyTranscripts.length} 条记录导出到 CSV 文件：`);
    console.log(outputPath);
  }
}

main()
  .catch((e) => {
    console.error('查询时发生错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
