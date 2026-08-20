import {
  GenerationMethod,
  PrismaClient,
  TrackingCadence,
  TrackingReportType,
} from '@prisma/client';
import { PARTICIPANT_SUMMARY_CONFIGS } from './config';
import type { ParticipantSummary } from './type';

export async function createMinuteParticipantSummaries(
  prisma: PrismaClient,
  meetings: { meetings: Array<{ meeting: { id: string } }> },
  minute: { id: string },
  platformUsers: {
    platformUsers: Array<{
      platformUser: { id: string; localUserId: string | null };
    }>;
  },
): Promise<ParticipantSummary[]> {
  const meeting = meetings.meetings[0].meeting;
  const now = new Date();
  const observedStartAt = new Date(now.getTime() - 60 * 60 * 1000);
  const users = platformUsers.platformUsers.slice(
    0,
    PARTICIPANT_SUMMARY_CONFIGS.length,
  );
  const summaries = await Promise.all(
    users.map(({ platformUser }, index) => {
      const config = PARTICIPANT_SUMMARY_CONFIGS[index];
      return prisma.minuteParticipantSummary.upsert({
        where: {
          versionGroupKey_version: {
            versionGroupKey: `minute:${minute.id}:user:${platformUser.id}`,
            version: 1,
          },
        },
        update: { partSummary: config.partSummary, keywords: config.keywords },
        create: {
          meetingId: meeting.id,
          minuteId: minute.id,
          platformUserId: platformUser.id,
          userName: config.userName,
          partSummary: config.partSummary,
          keywords: config.keywords,
          generatedBy: GenerationMethod.AI,
          aiModel: 'seed-model',
          versionGroupKey: `minute:${minute.id}:user:${platformUser.id}`,
          observedStartAt,
          observedEndAt: now,
        },
      });
    }),
  );

  await Promise.all(
    summaries.slice(0, 5).map((summary, index) => {
      const platformUser = users[index].platformUser;
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
          subjectNameSnapshot: summary.userName,
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
