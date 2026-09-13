/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-03 09:49:54
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-03 09:51:31
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/utils/format.utils.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

export class FormatUtils {
  /**
   * Format timestamp to HH:MM:SS format
   * @param timestamp - Timestamp in milliseconds
   * @returns Formatted time string
   */
  static formatTimestamp(timestamp: number): string {
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      throw new Error('Invalid timestamp: must be a non-negative number');
    }

    const hours = Math.floor(timestamp / 3600000);
    const minutes = Math.floor((timestamp % 3600000) / 60000);
    const seconds = Math.floor((timestamp % 60000) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
