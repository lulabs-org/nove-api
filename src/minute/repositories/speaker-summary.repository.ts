import { Injectable } from '@nestjs/common';
import { GenerationMethod, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SpeakerSummaryRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(minuteId: string, summaryId: string) {
    return this.prisma.speakerSummary.findFirst({
      where: {
        id: summaryId,
        minuteId,
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

  async upsert(params: Prisma.SpeakerSummaryUncheckedCreateInput) {
    return this.prisma.speakerSummary.upsert({
      where: {
        minuteId_platformUserId: {
          minuteId: params.minuteId,
          platformUserId: params.platformUserId,
        },
      },
      update: {
        partSummary: params.partSummary,
        keywords: params.keywords ?? [],
        generatedBy: params.generatedBy ?? GenerationMethod.AI,
        aiModel: params.aiModel ?? 'tencent-meeting-ai',
      },
      create: {
        ...params,
        generatedBy: params.generatedBy ?? GenerationMethod.AI,
        aiModel: params.aiModel ?? 'tencent-meeting-ai',
        keywords: params.keywords ?? [],
      },
    });
  }

  async update(summaryId: string, data: Prisma.SpeakerSummaryUpdateInput) {
    return this.prisma.speakerSummary.update({
      where: { id: summaryId },
      data,
    });
  }

  async delete(summaryId: string) {
    return this.prisma.speakerSummary.delete({
      where: { id: summaryId },
    });
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
        summary: {
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
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            segments: {
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
