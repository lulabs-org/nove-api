/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-03 08:11:41
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-03 09:24:31
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/repositories/meeting-summary.repository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { GenerationMethod, ProcessingStatus, Prisma } from '@prisma/client';

type CreateInput = Prisma.MeetingSummaryUncheckedCreateInput;

@Injectable()
export class MeetingSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInput) {
    return this.prisma.meetingSummary.create({
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
    const existingSummary = await this.prisma.meetingSummary.findFirst({
      where: {
        meetingId: data.meetingId,
        recordingId: data.recordingId,
        isLatest: true,
      },
    });

    if (existingSummary) {
      return this.prisma.meetingSummary.update({
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
      return this.prisma.meetingSummary.create({
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
}
