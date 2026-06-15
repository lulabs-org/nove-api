import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const recordingId = 'cmju21wam0007p0013pcvfmj7';
  const transcript = await prisma.transcript.findFirst({
    where: { recordingId },
    include: {
      paragraphs: {
        include: {
          sentences: {
            include: {
              words: true,
            },
          },
        },
      },
    },
  });

  if (!transcript) {
    console.log("No transcript found.");
    return;
  }

  const paragraphs = Array.from(transcript.paragraphs).sort(
    (a, b) => Number(a.startTimeMs) - Number(b.startTimeMs)
  );

  let fullText = '';
  for (const p of paragraphs) {
    const sentences = Array.from(p.sentences).sort(
      (a, b) => Number(a.startTimeMs) - Number(b.startTimeMs)
    );
    let paragraphText = '';
    for (const s of sentences) {
      if (s.text) {
        paragraphText += s.text;
      } else {
        const words = Array.from(s.words).sort(
          (a, b) => Number(a.startTimeMs) - Number(b.startTimeMs)
        );
        paragraphText += words.map((w) => w.text).join('');
      }
    }
    if (paragraphText) {
      fullText += paragraphText + '\n';
    }
  }

  console.log("----- TRANSCRIPT START -----");
  console.log(fullText.substring(0, 1000) + (fullText.length > 1000 ? '\n... (truncated)' : ''));
  console.log("----- TRANSCRIPT END -----");
}

main().catch(console.error).finally(() => prisma.$disconnect());
