import { Injectable } from '@nestjs/common';
import { GenerationMethod, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { retryVersionTransaction } from '@/common/utils/prisma-transaction-retry';

@Injectable()
export class SpeakerSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(minuteId: string, id: string) {
    return this.prisma.speakerSummary.findFirst({
      where: {
        id,
        minuteId,
        deletedAt: null,
      },
    });
  }

  async getMeetingIdByMinuteId(minuteId: string): Promise<string | null> {
    const minute = await this.prisma.minute.findFirst({
      where: { id: minuteId, deletedAt: null },
      select: { meetingId: true },
    });
    return minute?.meetingId || null;
  }

  async findMany(minuteId: string, skip: number, take: number) {
    const where: Prisma.SpeakerSummaryWhereInput = {
      minuteId,
      isLatest: true,
      deletedAt: null,
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.speakerSummary.count({ where }),
      this.prisma.speakerSummary.findMany({
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
      Prisma.SpeakerSummaryUncheckedCreateInput,
      'version' | 'isLatest'
    >,
  ) {
    return retryVersionTransaction(() =>
      this.prisma.$transaction(
        async (tx) => {
          const previous = await tx.speakerSummary.findFirst({
            where: {
              minuteId: params.minuteId,
              platformUserId: params.platformUserId,
              isLatest: true,
              deletedAt: null,
            },
            orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
          });
          if (previous) {
            await tx.speakerSummary.update({
              where: { id: previous.id },
              data: { isLatest: false },
            });
          }
          return tx.speakerSummary.create({
            data: {
              ...params,
              generatedBy: params.generatedBy ?? GenerationMethod.AI,
              aiModel: params.aiModel ?? 'tencent-meeting-ai',
              keywords: params.keywords ?? [],
              version: (previous?.version ?? 0) + 1,
              isLatest: true,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  async softDelete(minuteId: string, id: string) {
    return retryVersionTransaction(() =>
      this.prisma.$transaction(
        async (tx) => {
          const current = await tx.speakerSummary.findFirstOrThrow({
            where: {
              id,
              minuteId,
              deletedAt: null,
            },
          });
          await tx.speakerSummary.update({
            where: { id },
            data: { deletedAt: new Date(), isLatest: false },
          });
          if (current.isLatest) {
            const predecessor = await tx.speakerSummary.findFirst({
              where: {
                minuteId: current.minuteId,
                platformUserId: current.platformUserId,
                deletedAt: null,
              },
              orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
            });
            if (predecessor) {
              await tx.speakerSummary.update({
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
    return this.prisma.speakerSummary.findMany({
      where: {
        platformUserId: platformUserIds?.length
          ? { in: platformUserIds }
          : undefined,
        isLatest: true,
        deletedAt: null,
        createdAt: { gte: range.periodStart, lte: range.periodEnd },
      },
      include: {
        platformUser: { select: { localUserId: true, displayName: true } },
      },
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
          },
        },
        summaries: {
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
    return this.prisma.speakerSummary.findMany({
      where: {
        platformUserId: { in: params.platformUserIds },
        isLatest: true,
        deletedAt: null,
        createdAt: { gte: params.startDate, lte: params.endDate },
      },
      include: {
        platformUser: {
          select: { displayName: true },
        },
        minute: {
          select: {
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
        },
      },
    });
  }
}
