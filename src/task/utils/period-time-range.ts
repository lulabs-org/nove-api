/*
 * @Author: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @Date: 2026-01-28 21:34:04
 * @LastEditors: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @LastEditTime: 2026-01-29 17:51:51
 * @FilePath: \nove-api\src\task\utils\period-time-range.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PeriodType } from '@prisma/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PeriodTimeRange {
  // 生成当前天从早到晚的时间范围
  dailyRange(): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const now = new Date();

    const periodStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      0,
      0,
      0,
      0,
    );

    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      23,
      59,
      59,
      999,
    );

    return { periodStart, periodEnd };
  }

  // 生成当前周从早到晚的时间范围
  weeklyRange(): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const now = new Date();

    // 上周一的日期
    const lastMonday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay() - 6 + 1, // 调整到上周一
      0,
      0,
      0,
      0,
    );

    // 上周日的日期
    const lastSunday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay(), // 上周日
      23,
      59,
      59,
      999,
    );

    return { periodStart: lastMonday, periodEnd: lastSunday };
  }

  // 获取总结的时间范围
  getdayRange(periodType: PeriodType): {
    periodStart: Date;
    periodEnd: Date;
  } {
    let periodStart: Date;
    let periodEnd: Date;

    switch (periodType) {
      case PeriodType.WEEKLY:
        ({ periodStart, periodEnd } = this.weeklyRange());
        break;
      case PeriodType.DAILY:
        ({ periodStart, periodEnd } = this.dailyRange());
        break;
      default:
        ({ periodStart, periodEnd } = this.dailyRange());
    }

    return { periodStart, periodEnd };
  }
}
