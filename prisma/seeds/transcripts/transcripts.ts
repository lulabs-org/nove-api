import { PrismaClient } from '@prisma/client';
import { TRANSCRIPT_DIALOGUE } from './config';

export async function createSimulatedTranscript(
  prisma: PrismaClient,
  meetingRecordingId: string,
  speakerId: string,
) {
  const dialogue = TRANSCRIPT_DIALOGUE;

  const transcript = await prisma.transcript.create({
    data: {
      recordingId: meetingRecordingId,
      language: 'zh-CN',
      status: 1,
    },
  });

  for (const paragraph of dialogue) {
    const paragraphRecord = await prisma.paragraph.create({
      data: {
        transcriptId: transcript.id,
        pid: parseInt(paragraph.pid, 10),
        startTimeMs: BigInt(paragraph.start_time),
        endTimeMs: BigInt(paragraph.end_time),
        speakerId: speakerId,
      },
    });

    for (const sentence of paragraph.sentences) {
      const sentenceRecord = await prisma.sentence.create({
        data: {
          paragraphId: paragraphRecord.id,
          sid: parseInt(sentence.sid, 10),
          startTimeMs: BigInt(sentence.start_time),
          endTimeMs: BigInt(sentence.end_time),
          text: sentence.words.map((w) => w.text).join(''),
        },
      });

      const wordsData = sentence.words.map((word) => ({
        sentenceId: sentenceRecord.id,
        wid: parseInt(word.wid, 10),
        startTimeMs: BigInt(word.start_time),
        endTimeMs: BigInt(word.end_time),
        text: word.text,
      }));

      await prisma.word.createMany({
        data: wordsData,
      });
    }
  }

  return transcript;
}
