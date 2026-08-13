import { Injectable } from '@nestjs/common';
import { GenerationMethod, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { retryVersionTransaction } from '@/common/utils/prisma-transaction-retry';

@Injectable()
export class RecordingParticipantSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private groupKey(recordingId: string, platformUserId: string) {
    return `recording:${recordingId}:user:${platformUserId}`;
  }

  async findById(meetingId: string, recordingId: string, id: string) {
    return this.prisma.recordingParticipantSummary.findFirst({
      where: {
        id,
        meetingId,
        meetingRecordingId: recordingId,
        deletedAt: null,
      },
    });
  }

  async recordingBelongsToMeeting(meetingId: string, recordingId: string) {
    return Boolean(
      await this.prisma.meetingRecording.findFirst({
        where: { id: recordingId, meetingId, deletedAt: null },
        select: { id: true },
      }),
    );
  }

  async findMany(
    meetingId: string,
    recordingId: string,
    skip: number,
    take: number,
  ) {
    const where: Prisma.RecordingParticipantSummaryWhereInput = {
      meetingId,
      meetingRecordingId: recordingId,
      isLatest: true,
      deletedAt: null,
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.recordingParticipantSummary.count({ where }),
      this.prisma.recordingParticipantSummary.findMany({
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
      Prisma.RecordingParticipantSummaryUncheckedCreateInput,
      'versionGroupKey' | 'version' | 'isLatest' | 'previousSummaryId'
    >,
  ) {
    const versionGroupKey = this.groupKey(
      params.meetingRecordingId,
      params.platformUserId,
    );
    return retryVersionTransaction(() =>
      this.prisma.$transaction(
        async (tx) => {
          const previous = await tx.recordingParticipantSummary.findFirst({
            where: { versionGroupKey, isLatest: true, deletedAt: null },
            orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
          });
          if (previous) {
            await tx.recordingParticipantSummary.update({
              where: { id: previous.id },
              data: { isLatest: false },
            });
          }
          return tx.recordingParticipantSummary.create({
            data: {
              ...params,
              generatedBy: params.generatedBy ?? GenerationMethod.AI,
              aiModel: params.aiModel ?? 'tencent-meeting-ai',
              keywords: params.keywords ?? [],
              versionGroupKey,
              version: (previous?.version ?? 0) + 1,
              previousSummaryId: previous?.id,
              isLatest: true,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  async softDelete(meetingId: string, recordingId: string, id: string) {
    return retryVersionTransaction(() =>
      this.prisma.$transaction(
        async (tx) => {
          const current = await tx.recordingParticipantSummary.findFirstOrThrow(
            {
              where: {
                id,
                meetingId,
                meetingRecordingId: recordingId,
                deletedAt: null,
              },
            },
          );
          await tx.recordingParticipantSummary.update({
            where: { id },
            data: { deletedAt: new Date(), isLatest: false },
          });
          if (current.isLatest) {
            const predecessor = await tx.recordingParticipantSummary.findFirst({
              where: {
                versionGroupKey: current.versionGroupKey,
                deletedAt: null,
              },
              orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
            });
            if (predecessor) {
              await tx.recordingParticipantSummary.update({
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
    return this.prisma.recordingParticipantSummary.findMany({
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

  async findGenerationContext(recordingId: string) {
    return this.prisma.meetingRecording.findFirst({
      where: { id: recordingId, deletedAt: null },
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
    return this.prisma.recordingParticipantSummary.findMany({
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

