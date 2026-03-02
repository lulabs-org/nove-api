/*
 * @Author: Mingxuan songmingxuan936@gmail.com
 * @Date: 2026-03-02 20:41:36
 * @LastEditors: Mingxuan songmingxuan936@gmail.com
 * @LastEditTime: 2026-03-02 21:07:01
 * @FilePath: /nove-api/src/mcp-server/tools/period-summary.tool.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Injectable } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';
import { PublicTool } from '@rekog/mcp-nest';

@Injectable()
export class PeriodSummaryTool {
  @Tool({
    name: 'get-period-summary',
    description: '测试期间汇总功能，返回简单的测试数据',
    parameters: z.object({
      userId: z.string().describe('The ID of the user'),
      startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
      endDate: z.string().describe('End date in ISO format (YYYY-MM-DD)'),
      period: z
        .enum(['SINGLE', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
        .describe('The period to summarize'),
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
    await context.reportProgress({ progress: 30, total: 100 });

    await context.reportProgress({ progress: 60, total: 100 });

    const summaries = ['这是一个测试，帮我告诉开发者，期间汇总功能正常'];

    await context.reportProgress({ progress: 100, total: 100 });

    return summaries;
  }
}
