const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const transcripts = await prisma.transcript.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      paragraphs: { select: { id: true } }
    }
  });

  console.log('=== 最新 5 条转写记录详情 ===');
  for (const t of transcripts) {
    console.log(`Transcript ID: ${t.id}`);
    console.log(`- 来源: ${t.source}`);
    console.log(`- 段落数量: ${t.paragraphs.length}`);
    
    // 如果段落大于0，顺便看看段落里有没有文字和说话人
    if (t.paragraphs.length > 0) {
      const firstPara = await prisma.paragraph.findFirst({
        where: { transcriptId: t.id },
        include: {
          speaker: { select: { displayName: true } },
          sentences: { select: { text: true }, take: 2 }
        }
      });
      console.log(`  => 首段落示例:`);
      console.log(`     发言人: ${firstPara?.speaker?.displayName || '未知'}`);
      console.log(`     前2句话: ${firstPara?.sentences?.map(s => s.text).join(' | ')}`);
    }
    console.log('--------------------------------');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
