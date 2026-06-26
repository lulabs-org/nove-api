import { PrismaClient, Prisma } from '@prisma/client';
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

  const segmentsData: Prisma.TranscriptSegmentCreateManyInput[] = [];

  for (const paragraph of dialogue) {
    for (const sentence of paragraph.sentences) {
      const text = sentence.words.map((w) => w.text).join('');
      const wordsDetail = sentence.words.map((w) => ({
        word: w.text,
        start: w.start_time,
        end: w.end_time,
      }));

      segmentsData.push({
        transcriptId: transcript.id,
        speakerId: speakerId,
        speakerName: paragraph.speaker_info?.username || null,
        startTimeMs: BigInt(sentence.start_time),
        endTimeMs: BigInt(sentence.end_time),
        text,
        wordsDetail: wordsDetail as unknown as Prisma.InputJsonValue,
      });
    }
  }

  await prisma.transcriptSegment.createMany({
    data: segmentsData,
  });

  return transcript;
}
