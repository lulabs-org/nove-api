/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-03 08:11:41
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 19:35:27
 * @FilePath: /nove_api/src/tencent-mtg/repositories/meeting-summary.repository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { GenerationMethod, ProcessingStatus, Prisma } from '@prisma/client';
import { retryVersionTransaction } from '@/common/utils/prisma-transaction-retry';
import { CreateRecordingSummaryDto } from '../dto/minute.dto';

type CreateInput = Prisma.MinuteSummaryUncheckedCreateInput;

@Injectable()
export class MinuteSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInput) {
    return this.prisma.minuteSummary.create({
      data: {
        ...data,
        generatedBy: data.generatedBy || GenerationMethod.AI,
        aiModel: data.aiModel || 'tencent-meeting-ai',
        status: data.status || ProcessingStatus.COMPLETED,
        language: data.language || 'zh-CN',
        version: data.version || 1,
        isLatest: data.isLatest !== undefined ? data.isLatest : true,
      },
    });
  }

  async upsert(data: CreateInput) {
    const existingSummary = await this.prisma.minuteSummary.findFirst({
      where: {
        meetingId: data.meetingId,
        minuteId: data.minuteId,
        isLatest: true,
      },
    });

    if (existingSummary) {
      return this.prisma.minuteSummary.update({
        where: { id: existingSummary.id },
        data: {
          content: data.content,
          aiMinutes: data.aiMinutes,
          actionItems: data.actionItems,
          generatedBy: data.generatedBy,
          aiModel: data.aiModel,
          status: data.status,
          processingTime: data.processingTime,
          language: data.language,
          updatedAt: new Date(),
        },
      });
    } else {
      return this.prisma.minuteSummary.create({
        data: {
          ...data,
          generatedBy: data.generatedBy || GenerationMethod.AI,
          aiModel: data.aiModel || 'tencent-meeting-ai',
          status: data.status || ProcessingStatus.COMPLETED,
          language: data.language || 'zh-CN',
          version: data.version || 1,
          isLatest: data.isLatest !== undefined ? data.isLatest : true,
        },
      });
    }
  }

  async findByMinuteId(minuteId: string) {
    return this.prisma.minuteSummary.findFirst({
      where: {
        minuteId,
        isLatest: true,
        deletedAt: null,
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findByRecordingId(minuteId: string) {
    return this.prisma.minuteSummary.findFirst({
      where: {
        minuteId,
        isLatest: true,
        deletedAt: null,
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createExternalForRecording(
    meetingId: string | null,
    minuteId: string,
    data: CreateRecordingSummaryDto,
  ) {
    return retryVersionTransaction(() =>
      this.prisma.$transaction(
        async (tx) => {
          const previous = await tx.minuteSummary.findFirst({
            where: { minuteId, isLatest: true, deletedAt: null },
            orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
          });

          if (previous) {
            await tx.minuteSummary.update({
              where: { id: previous.id },
              data: { isLatest: false },
            });
          }

          return tx.minuteSummary.create({
            data: {
              meetingId,
              minuteId,
              title: data.title,
              content: data.content,
              keywords: data.keywords ?? [],
              aiMinutes: data.aiMinutes as Prisma.InputJsonValue | undefined,
              keyPoints: data.keyPoints as Prisma.InputJsonValue | undefined,
              actionItems: data.actionItems as
                | Prisma.InputJsonValue
                | undefined,
              decisions: data.decisions as Prisma.InputJsonValue | undefined,
              speakerInsights: data.speakerInsights as
                | Prisma.InputJsonValue
                | undefined,
              goldenQuotes: data.goldenQuotes as
                | Prisma.InputJsonValue
                | undefined,
              metadata: data.metadata as Prisma.InputJsonValue | undefined,
              generatedBy: GenerationMethod.AI,
              aiModel: data.aiModel ?? 'external-ai',
              confidence: data.confidence,
              language: data.language ?? 'zh-CN',
              processingTime: data.processingTime,
              status: ProcessingStatus.COMPLETED,
              version: (previous?.version ?? 0) + 1,
              isLatest: true,
              parentSummaryId: previous?.id,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  async findById(id: string) {
    return this.prisma.minuteSummary.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findMany(minuteId: string, skip: number, take: number) {
    const [total, records] = await this.prisma.$transaction([
      this.prisma.minuteSummary.count({
        where: { minuteId, deletedAt: null },
      }),
      this.prisma.minuteSummary.findMany({
        where: { minuteId, deletedAt: null },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, records };
  }

  async update(id: string, data: Prisma.MinuteSummaryUpdateInput) {
    return this.prisma.minuteSummary.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string) {
    return this.prisma.minuteSummary.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
