/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-09 00:52:33
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-09 01:04:27
 * @FilePath: /lulab_backend/src/common/utils/time.util.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

/**
 * Parses a duration string and converts it to milliseconds.
 *
 * Supported formats:
 * - Number only (default unit is seconds): '60' -> 60000ms
 * - Milliseconds: '100ms' -> 100ms
 * - Seconds: '30s' -> 30000ms
 * - Minutes: '5m' -> 300000ms
 * - Hours: '2h' -> 7200000ms
 * - Days: '1d' -> 86400000ms
 * - Weeks: '1w' -> 604800000ms
 *
 * @param duration - The duration string to parse (e.g., '30s', '5m', '1h')
 * @returns The duration in milliseconds
 * @throws {Error} If the duration format is unsupported
 *
 * @example
 * parseDurationToMs('30s') // 30000
 * parseDurationToMs('5m')  // 300000
 * parseDurationToMs('1h')  // 3600000
 */
export function parseDurationToMs(duration: string): number {
  const m = /^(\d+)(ms|s|m|h|d|w)?$/i.exec(duration.trim());
  if (!m) throw new Error(`Unsupported duration format: ${duration}`);
  const val = Number(m[1]);
  const unit = (m[2] || 's').toLowerCase();
  const unitMap: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  return val * (unitMap[unit] ?? 1000);
}
