/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-18 14:04:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-19 18:30:45
 * @FilePath: /nove_api/src/mcp-server/repositories/participant-summary.repository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PeriodType } from '@prisma/client';
import type { Meeting, ParticipantSummary } from '@prisma/client';

@Injectable()
export class ParticipantSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSummaries(params: {
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
}
