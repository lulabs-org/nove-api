/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 03:36:25
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 11:45:59
 * @FilePath: /nove_api/prisma/seeds/mock/minutes/minute-summaries/type.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Prisma } from '@prisma/client';

export type MinuteSummaryConfig = Omit<
  Prisma.MinuteSummaryUncheckedCreateInput,
  'id' | 'meetingId' | 'minuteId' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

export interface CreatedMinuteSummaries {
  config: Prisma.MinuteSummaryUncheckedCreateInput;
  teamSummary: Prisma.MinuteSummaryGetPayload<Record<string, never>>;
}
