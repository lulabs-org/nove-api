import { GenerationMethod, PrismaClient } from '@prisma/client';
import { SPEAKER_SUMMARY_CONFIGS } from './config';
import type { SpeakerSummary } from './type';

export async function createSpeakerSummaries(
  prisma: PrismaClient,
  meetings: { meetings: Array<{ meeting: { id: string } }> },
  minute: { id: string },
  platformUsers: {
    platformUsers: Array<{
      platformUser: { id: string; localUserId: string | null };
    }>;
  },
): Promise<SpeakerSummary[]> {
  const users = platformUsers.platformUsers.slice(
    0,
    SPEAKER_SUMMARY_CONFIGS.length,
  );
  const summaries = await Promise.all(
    users.map(({ platformUser }, index) => {
      const config = SPEAKER_SUMMARY_CONFIGS[index];
      return prisma.speakerSummary.upsert({
        where: {
          minuteId_platformUserId: {
            minuteId: minute.id,
            platformUserId: platformUser.id,
          },
        },
        update: { partSummary: config.partSummary, keywords: config.keywords },
        create: {
          minuteId: minute.id,
          platformUserId: platformUser.id,
          partSummary: config.partSummary,
          keywords: config.keywords,
          generatedBy: GenerationMethod.AI,
          aiModel: 'seed-model',
        },
      });
    }),
  );

  return summaries;
}
