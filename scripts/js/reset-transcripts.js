const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const transcripts = await prisma.transcript.findMany({
    include: {
      paragraphs: { select: { id: true } }
    }
  });
  
  let deletedCount = 0;
  for (const t of transcripts) {
    if (t.paragraphs.length === 0) {
      await prisma.transcript.delete({ where: { id: t.id } });
      deletedCount++;
    }
  }
  console.log(`Deleted ${deletedCount} empty transcripts.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
