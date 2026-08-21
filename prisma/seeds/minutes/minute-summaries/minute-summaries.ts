/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 05:21:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 11:38:15
 * @FilePath: /nove_api/prisma/seeds/mock/minutes/minute-summaries/minute-summaries.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient, ProcessingStatus, Prisma } from '@prisma/client';
import { MINUTE_SUMMARY_CONFIGS } from './config';
import type { CreatedMinuteSummaries } from './type';

export async function createMinuteSummary(
  prisma: PrismaClient,
  meetings: {
    meetings: Array<{
      meeting: Prisma.MeetingGetPayload<Record<string, never>>;
    }>;
  },
  platformUsers: {
    platformUsers: Array<{
      key: string;
      platformUser: Prisma.PlatformUserGetPayload<Record<string, never>>;
    }>;
  },
  minute: { id: string },
): Promise<CreatedMinuteSummaries['teamSummary']> {
  return prisma.minuteSummary.create({
    data: {
      minuteId: minute.id,
      ...MINUTE_SUMMARY_CONFIGS.teamSummary,
      processingTime: 30000,
      status: ProcessingStatus.COMPLETED,
    },
  });
}
