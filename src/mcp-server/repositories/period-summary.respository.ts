/*
 * @Author: Mingxuan songmingxuan936@gmail.com
 * @Date: 2026-03-18 14:10:00
 * @LastEditors: Mingxuan songmingxuan936@gmail.com
 * @LastEditTime: 2026-03-18 14:10:00
 * @FilePath: /nove-api/src/mcp-server/repositories/period-summary.respository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PeriodType } from '@prisma/client';

@Injectable()
export class PeriodSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find platform user IDs for a given local user ID
   */
  async findPlatformUserIds(localUserId: string): Promise<string[]> {
    const platformUsers = await this.prisma.platformUser.findMany({
      where: {
        localUserId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    return platformUsers.map((pu) => pu.id);
  }

  /**
   * Find participant summaries by platform user IDs, date range, and period type
   */
  async findSummaries(params: {
    platformUserIds: string[];
    startDate: Date;
    endDate: Date;
    periodType: PeriodType;
  }) {
    const { platformUserIds, startDate, endDate, periodType } = params;

    return this.prisma.participantSummary.findMany({
      where: {
        platformUserId: {
          in: platformUserIds,
        },
        periodType,
        periodStart: {
          gte: startDate,
        },
        periodEnd: {
          lte: endDate,
        },
        deletedAt: null,
      },
      orderBy: {
        periodStart: 'desc',
      },
    });
  }
}
