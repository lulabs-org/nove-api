import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const transcript = await prisma.transcript.findFirst({
    where: { deletedAt: null },
    include: { paragraphs: true }
  });
  console.log(transcript ? transcript.recordingId : 'No transcript found');
}

main().catch(console.error).finally(() => prisma.$disconnect());
