/*
 * @Author: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @Date: 2026-01-28 21:34:04
 * @LastEditors: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @LastEditTime: 2026-01-30 19:50:01
 * @FilePath: \nove-api\src\task\utils\period-time-range.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PeriodType } from '@prisma/client';

export interface PeriodContext {
  parent: PeriodType;
  label: string;
}

const PERIOD_CONTEXT_MAP: Partial<Record<PeriodType, PeriodContext>> = {
  [PeriodType.YEARLY]: { parent: PeriodType.MONTHLY, label: '本年' },
  [PeriodType.QUARTERLY]: { parent: PeriodType.MONTHLY, label: '本季度' },
  [PeriodType.MONTHLY]: { parent: PeriodType.DAILY, label: '本月' },
  [PeriodType.WEEKLY]: { parent: PeriodType.DAILY, label: '本周' },
  [PeriodType.DAILY]: { parent: PeriodType.SINGLE, label: '本日' },
};

export const getPeriodContext = (
  periodType: PeriodType,
): PeriodContext | undefined => PERIOD_CONTEXT_MAP[periodType];

// 获取对应周期的起止时间（基于当前触发时间）
export const getdayRange = (
  periodType: PeriodType,
  targetDate?: Date,
): { periodStart: Date; periodEnd: Date } => {
  const now = targetDate || new Date();
  const [y, m, d] = [now.getFullYear(), now.getMonth(), now.getDate()];
  let start: Date, end: Date;

  switch (periodType) {
    case PeriodType.YEARLY:
      start = new Date(y, 0, 1, 0, 0, 0, 0);
      end = new Date(y, 11, 31, 23, 59, 59, 999);
      break;
    case PeriodType.MONTHLY:
      start = new Date(y, m, 1, 0, 0, 0, 0);
      end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      break;
    case PeriodType.WEEKLY: {
      const currentDay = now.getDay() === 0 ? 7 : now.getDay();
      start = new Date(y, m, d - currentDay + 1, 0, 0, 0, 0);
      end = new Date(y, m, d + (7 - currentDay), 23, 59, 59, 999);
      break;
    }
    case PeriodType.DAILY:
    default:
      start = new Date(y, m, d, 0, 0, 0, 0);
      end = new Date(y, m, d, 23, 59, 59, 999);
      break;
  }

  return { periodStart: start, periodEnd: end };
};
