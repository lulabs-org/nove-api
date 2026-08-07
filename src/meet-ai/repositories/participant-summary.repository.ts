import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { GenerationMethod, PeriodType, Prisma } from '@prisma/client';
import type { Meeting, ParticipantSummary } from '@prisma/client';

@Injectable()
export class ParticipantSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ParticipantSummaryUncheckedCreateInput) {
    // Provide some application-level defaults if they are missing
    if (!data.generatedBy) data.generatedBy = GenerationMethod.AI;
    if (!data.aiModel) data.aiModel = 'tencent-meeting-ai';
    if (!data.keywords) data.keywords = [];
    
    return this.prisma.participantSummary.create({ data });
  }

  async upsert(data: Prisma.ParticipantSummaryUncheckedCreateInput) {
    const existingSummary = await this.prisma.participantSummary.findFirst({
      where: {
        platformUserId: data.platformUserId,
        meetingId: data.meetingId,
        meetingRecordingId: data.meetingRecordingId,
        periodType: data.periodType,
        isLatest: true,
      },
    });

    if (existingSummary) {
      return this.prisma.participantSummary.update({
        where: { id: existingSummary.id },
        data,
      });
    } else {
      return this.create(data);
    }
  }

  async findManyByDateRange(params: {
    platformUserIds: string[];
    startDate: Date;
    endDate: Date;
    periodType: PeriodType;
  }): Promise<
    (ParticipantSummary & {
      meeting: Pick<
        Meeting,
        'id' | 'title' | 'startAt' | 'endAt' | 'durationSeconds'
      > | null;
    })[]
  > {
    const { platformUserIds, startDate, endDate, periodType } = params;
    return this.prisma.participantSummary.findMany({
      where: {
        platformUserId: { in: platformUserIds },
        periodType,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
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

  async findLatestSummary(params: {
    periodType: PeriodType;
    platformUserId: string;
    meetingId: string;
    meetingRecordingId: string;
    isLatest: boolean;
  }) {
    return this.prisma.participantSummary.findFirst({
      where: {
        periodType: params.periodType,
        platformUserId: params.platformUserId,
        meetingId: params.meetingId,
        meetingRecordingId: params.meetingRecordingId,
        isLatest: params.isLatest,
        deletedAt: null,
      },
    });
  }

  async update(id: string, data: Prisma.ParticipantSummaryUpdateInput) {
    return this.prisma.participantSummary.update({
      where: { id },
      data,
    });
  }

  async findUserIdsByPeriod(params: {
    periodStart: Date;
    periodEnd: Date;
    parentPeriodType: PeriodType;
  }) {
    return (
      (await this.prisma.participantSummary.findMany({
        where: {
          platformUserId: { not: null },
          periodType: params.parentPeriodType,
          OR: [
            {
              periodStart: {
                gte: params.periodStart,
                lte: params.periodEnd,
              },
            },
            {
              periodStart: null,
              createdAt: {
                gte: params.periodStart,
                lte: params.periodEnd,
              },
            },
          ],
        },
        select: {
          platformUserId: true,
        },
      })) ?? []
    );
  }

  async findPeriodSummariesByPlatformUserId(params: {
    parentPeriodType: PeriodType;
    platformUserId: string;
    periodStart: Date;
    periodEnd: Date;
  }) {
    return await this.prisma.participantSummary.findMany({
      where: {
        platformUserId: params.platformUserId,
        periodType: params.parentPeriodType,
        OR: [
          {
            periodStart: {
              gte: params.periodStart,
              lte: params.periodEnd,
            },
          },
          {
            periodStart: null,
            createdAt: {
              gte: params.periodStart,
              lte: params.periodEnd,
            },
          },
        ],
      },
      select: {
        id: true,
        partSummary: true,
        userName: true,
        periodStart: true,
        periodEnd: true,
        platformUserId: true,
      },
    });
  }

  async createSummaryRelation(data: {
    parentSummaryId: string;
    childSummaryId: string;
    parentPeriodType: PeriodType;
    childPeriodType: PeriodType;
  }) {
    return this.prisma.summaryRelation.create({
      data,
    });
  }
}
