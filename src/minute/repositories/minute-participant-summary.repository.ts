import { Injectable } from '@nestjs/common';
import { GenerationMethod, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { retryVersionTransaction } from '@/common/utils/prisma-transaction-retry';

@Injectable()
export class MinuteParticipantSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private groupKey(minuteId: string, platformUserId: string) {
    return `recording:${minuteId}:user:${platformUserId}`;
  }

  async findById(meetingId: string, minuteId: string, id: string) {
    return this.prisma.minuteParticipantSummary.findFirst({
      where: {
        id,
        meetingId,
        minuteId,
        deletedAt: null,
      },
    });
  }

  async recordingBelongsToMeeting(meetingId: string, minuteId: string) {
    return Boolean(
      await this.prisma.minute.findFirst({
        where: { id: minuteId, meetingId, deletedAt: null },
        select: { id: true },
      }),
    );
  }

  async findMany(
    meetingId: string,
    minuteId: string,
    skip: number,
    take: number,
  ) {
    const where: Prisma.MinuteParticipantSummaryWhereInput = {
      meetingId,
      minuteId,
      isLatest: true,
      deletedAt: null,
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.minuteParticipantSummary.count({ where }),
      this.prisma.minuteParticipantSummary.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
    return { total, records };
  }

  async saveNewVersion(
    params: Omit<
      Prisma.MinuteParticipantSummaryUncheckedCreateInput,
      'versionGroupKey' | 'version' | 'isLatest' | 'previousSummaryId'
    >,
  ) {
    const versionGroupKey = this.groupKey(
      params.minuteId,
      params.platformUserId,
    );
    return retryVersionTransaction(() =>
      this.prisma.$transaction(
        async (tx) => {
          const previous = await tx.minuteParticipantSummary.findFirst({
            where: { versionGroupKey, isLatest: true, deletedAt: null },
            orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
          });
          if (previous) {
            await tx.minuteParticipantSummary.update({
              where: { id: previous.id },
              data: { isLatest: false },
            });
          }
          return tx.minuteParticipantSummary.create({
            data: {
              ...params,
              generatedBy: params.generatedBy ?? GenerationMethod.AI,
              aiModel: params.aiModel ?? 'tencent-meeting-ai',
              keywords: params.keywords ?? [],
              versionGroupKey,
              version: (previous?.version ?? 0) + 1,
              previousSummaryId: previous?.id ?? null,
              isLatest: true,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  async softDelete(meetingId: string, minuteId: string, id: string) {
    return retryVersionTransaction(() =>
      this.prisma.$transaction(
        async (tx) => {
          const current = await tx.minuteParticipantSummary.findFirstOrThrow({
            where: {
              id,
              meetingId,
              minuteId,
              deletedAt: null,
            },
          });
          await tx.minuteParticipantSummary.update({
            where: { id },
            data: { deletedAt: new Date(), isLatest: false },
          });
          if (current.isLatest) {
            const predecessor = await tx.minuteParticipantSummary.findFirst({
              where: {
                versionGroupKey: current.versionGroupKey,
                deletedAt: null,
              },
              orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
            });
            if (predecessor) {
              await tx.minuteParticipantSummary.update({
                where: { id: predecessor.id },
                data: { isLatest: true },
              });
            }
          }
          return current;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  findForPeriodicReport(
    range: { periodStart: Date; periodEnd: Date },
    platformUserIds?: string[],
  ) {
    return this.prisma.minuteParticipantSummary.findMany({
      where: {
        platformUserId: platformUserIds?.length
          ? { in: platformUserIds }
          : undefined,
        isLatest: true,
        deletedAt: null,
        OR: [
          {
            observedStartAt: { gte: range.periodStart, lte: range.periodEnd },
          },
          {
            observedStartAt: null,
            createdAt: { gte: range.periodStart, lte: range.periodEnd },
          },
        ],
      },
      include: { platformUser: { select: { localUserId: true } } },
    });
  }

  async findGenerationContext(minuteId: string) {
    return this.prisma.minute.findFirst({
      where: { id: minuteId, deletedAt: null },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        meeting: {
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            deletedAt: true,
            participants: {
              where: { deletedAt: null },
              select: { id: true, ptUserId: true },
            },
            minuteSummaries: {
              where: { isLatest: true, deletedAt: null },
              orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
              take: 1,
              select: {
                aiMinutes: true,
                keyPoints: true,
                actionItems: true,
                decisions: true,
                goldenQuotes: true,
                keywords: true,
              },
            },
          },
        },
        transcripts: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            segments: {
              where: { deletedAt: null },
              orderBy: { startTimeMs: 'asc' },
              select: {
                startTimeMs: true,
                speakerName: true,
                text: true,
                speaker: { select: { id: true, displayName: true } },
              },
            },
          },
        },
      },
    });
  }

  async findByDateRange(params: {
    platformUserIds: string[];
    startDate: Date;
    endDate: Date;
  }) {
    return this.prisma.minuteParticipantSummary.findMany({
      where: {
        platformUserId: { in: params.platformUserIds },
        isLatest: true,
        deletedAt: null,
        createdAt: { gte: params.startDate, lte: params.endDate },
      },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            durationSeconds: true,
          },
        },
      },
    });
  }
}
