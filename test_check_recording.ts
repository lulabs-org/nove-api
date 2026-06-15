import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const recordingId = 'cmqf9bjys1ozbpu01wmpgd0d8';
  const transcript = await prisma.transcript.findFirst({
    where: { recordingId },
    include: {
      paragraphs: true
    }
  });

  if (!transcript) {
    console.log("No transcript found for this recordingId");
  } else {
    console.log("Transcript found. Paragraph count:", transcript.paragraphs.length);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
