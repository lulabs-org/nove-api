require('dotenv-expand').expand(require('dotenv').config({ quiet: true }));
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  adapter: new PrismaPg(
    {
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 300000,
    },
    {
      schema: new URL(process.env.DATABASE_URL).searchParams.get('schema') || 'public',
    },
  ),
});

async function main() {
  const recordings = await prisma.meetingRecording.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5
  });

  const recordingIds = recordings.map(r => r.id);
  
  const transcripts = await prisma.transcript.findMany({
    where: { recordingId: { in: recordingIds } },
    include: {
      paragraphs: { select: { id: true } },
      segments: { select: { id: true } }
    }
  });
  
  console.log("=== Transcripts associated with recent recordings ===");
  console.log(transcripts.map(t => ({
    id: t.id,
    recordingId: t.recordingId,
    status: t.status,
    paragraphsCount: t.paragraphs.length,
    segmentsCount: t.segments.length
  })));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
