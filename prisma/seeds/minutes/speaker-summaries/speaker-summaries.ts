import {
  GenerationMethod,
  PrismaClient,
  TrackingCadence,
  TrackingReportType,
} from '@prisma/client';
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
  const now = new Date();
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

  await Promise.all(
    summaries.slice(0, 5).map((summary, index) => {
      const platformUser = users[index].platformUser;
      const config = SPEAKER_SUMMARY_CONFIGS[index];
      const periodStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const periodEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
      const identity = platformUser.localUserId
        ? `user:${platformUser.localUserId}`
        : `platform:${platformUser.id}`;
      return prisma.userTrackingReport.upsert({
        where: {
          versionGroupKey_version: {
            versionGroupKey: `${identity}:PERIODIC_MEETING_SUMMARY:DAILY:${periodStart.getTime()}:${periodEnd.getTime()}:-`,
            version: 1,
          },
        },
        update: { content: `【每日总结】${summary.partSummary}` },
        create: {
          subjectUserId: platformUser.localUserId,
          platformUserId: platformUser.id,
          subjectNameSnapshot: config?.userName || '未知',
          trackingType: TrackingReportType.PERIODIC_MEETING_SUMMARY,
          cadence: TrackingCadence.DAILY,
          periodStart,
          periodEnd,
          content: `【每日总结】${summary.partSummary}`,
          versionGroupKey: `${identity}:PERIODIC_MEETING_SUMMARY:DAILY:${periodStart.getTime()}:${periodEnd.getTime()}:-`,
          minuteSummarySources: {
            create: { minuteSummaryId: summary.id },
          },
        },
      });
    }),
  );
  return summaries;
}
