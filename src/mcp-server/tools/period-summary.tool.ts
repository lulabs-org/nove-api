/*
 * @Author: Mingxuan songmingxuan936@gmail.com
 * @Date: 2026-03-02 20:41:36
 * @LastEditors: Mingxuan songmingxuan936@gmail.com
 * @LastEditTime: 2026-03-02 21:20:40
 * @FilePath: /nove-api/src/mcp-server/tools/period-summary.tool.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Injectable } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';
import { PublicTool } from '@rekog/mcp-nest';
import { PeriodSummaryRepository } from '../repositories/period-summary.respository';
import { PeriodType } from '@prisma/client';

@Injectable()
export class PeriodSummaryTool {
  constructor(
    private readonly periodSummaryRepo: PeriodSummaryRepository,
  ) {}

  @Tool({
    name: 'get-period-summary',
    description: 'Get meeting summaries within a specified time range',
    parameters: z.object({
      userId: z.string().describe('The ID of the user'),
      startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
      endDate: z.string().describe('End date in ISO format (YYYY-MM-DD)'),
      period: z
        .enum(['SINGLE', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
        .describe(
          'The period to summarize, SINGLE refers to the summary of a single meeting.',
        ),
    }),
  })
  @PublicTool()
  async getPeriodSummary(
    {
      userId,
      startDate,
      endDate,
      period,
    }: { userId: string; startDate: string; endDate: string; period: string },
    context: Context,
  ) {
    await context.reportProgress({ progress: 10, total: 100 });

    // 1. 获取所有相关的 platform user id
    const platformUserIds = await this.periodSummaryRepo.findPlatformUserIds(userId);
    
    if (platformUserIds.length === 0) {
      await context.reportProgress({ progress: 100, total: 100 });
      return [];
    }

    await context.reportProgress({ progress: 40, total: 100 });

    // 2. 检索 ParticipantSummary
    const summaries = await this.periodSummaryRepo.findSummaries({
      platformUserIds,
      startDate: new Date(`${startDate}T00:00:00Z`),
      endDate: new Date(`${endDate}T23:59:59Z`),
      periodType: period as PeriodType,
    });

    await context.reportProgress({ progress: 100, total: 100 });

    return summaries.map(s => ({
      id: s.id,
      userName: s.userName,
      summary: s.partSummary,
      keywords: s.keywords,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      periodType: s.periodType,
    }));
  }
}
