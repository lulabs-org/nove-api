import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { GenerationMethod, PeriodType, Prisma } from '@prisma/client';
import type { Meeting, ParticipantSummary } from '@prisma/client';

@Injectable()
export class ParticipantSummaryRepository {
  private readonly logger = new Logger(ParticipantSummaryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // WRITE OPERATIONS
  // ==========================================

  async create(data: Prisma.ParticipantSummaryUncheckedCreateInput) {
    // Provide some application-level defaults if they are missing
    if (!data.generatedBy) data.generatedBy = GenerationMethod.AI;
    if (!data.aiModel) data.aiModel = 'tencent-meeting-ai';
    if (!data.keywords) data.keywords = [];
    
    return this.prisma.participantSummary.create({ data });
  }

  async update(id: string, data: Prisma.ParticipantSummaryUpdateInput) {
    return this.prisma.participantSummary.update({
      where: { id },
      data,
    });
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

  async saveNewVersion(params: Prisma.ParticipantSummaryUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.participantSummary.findFirst({
        where: {
          periodType: params.periodType,
          platformUserId: params.platformUserId,
          meetingId: params.meetingId,
          meetingRecordingId: params.meetingRecordingId,
          isLatest: true,
          deletedAt: null,
        },
      });

      if (existing) {
        this.logger.warn(`参会者: ${params.userName} 已存在最新总结，将弃用旧版本并创建新版本`);
        await tx.participantSummary.update({
          where: { id: existing.id },
          data: { isLatest: false },
        });
      }

      return tx.participantSummary.create({
        data: {
          ...params,
          version: existing ? existing.version + 1 : 1,
          isLatest: true,
        },
      });
    });
  }

  // ==========================================
  // READ OPERATIONS
  // ==========================================

  async findByDateRange(params: {
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

  private getPeriodCondition(start: Date, end: Date): Prisma.ParticipantSummaryWhereInput {
    return {
      OR: [
        { periodStart: { gte: start, lte: end } },
        { periodStart: null, createdAt: { gte: start, lte: end } },
      ],
    };
  }

  async findActiveUserIds(params: {
    periodStart: Date;
    periodEnd: Date;
    parentPeriodType: PeriodType;
  }) {
    return this.prisma.participantSummary.findMany({
      where: {
        platformUserId: { not: null },
        periodType: params.parentPeriodType,
        ...this.getPeriodCondition(params.periodStart, params.periodEnd),
      },
      select: {
        platformUserId: true,
      },
      distinct: ['platformUserId'],
    });
  }

  async findByUserAndPeriod(params: {
    parentPeriodType: PeriodType;
    platformUserId: string;
    periodStart: Date;
    periodEnd: Date;
  }) {
    return this.prisma.participantSummary.findMany({
      where: {
        platformUserId: params.platformUserId,
        periodType: params.parentPeriodType,
        ...this.getPeriodCondition(params.periodStart, params.periodEnd),
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
}
