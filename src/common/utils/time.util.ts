/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-09 00:52:33
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 14:00:37
 * @FilePath: /nove_api/src/common/utils/time.util.ts
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

/**
 * Formats a date to a specified timezone string.
 *
 * @param date - The date to format, can be null or undefined
 * @param timezoneOffsetHours - The timezone offset in hours from UTC (default: 8 for Beijing time)
 * @returns Formatted time string in YYYY-MM-DD HH:MM:SS format, or '未知' if date is null/undefined
 *
 * @example
 * formatToTimezone(new Date()) // "2026-03-30 12:34:56" (Beijing time, UTC+8)
 * formatToTimezone(new Date(), 0) // "2026-03-30 04:34:56" (UTC time)
 * formatToTimezone(new Date(), -5) // "2026-03-29 23:34:56" (EST time, UTC-5)
 * formatToTimezone(null) // "未知"
 */
export function formatToTimezone(
  date: Date | null | undefined,
  timezoneOffsetHours: number = 8,
): string {
  if (!date) return '未知';
  const timezoneTime = new Date(
    date.getTime() + timezoneOffsetHours * 60 * 60 * 1000,
  );
  const year = timezoneTime.getUTCFullYear();
  const month = String(timezoneTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(timezoneTime.getUTCDate()).padStart(2, '0');
  const hours = String(timezoneTime.getUTCHours()).padStart(2, '0');
  const minutes = String(timezoneTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(timezoneTime.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formats a date to Beijing time (UTC+8) string.
 *
 * @param date - The date to format, can be null or undefined
 * @returns Formatted Beijing time string in YYYY-MM-DD HH:MM:SS format, or '未知' if date is null/undefined
 *
 * @example
 * formatToBeijingTime(new Date()) // "2026-03-30 12:34:56"
 * formatToBeijingTime(null) // "未知"
 */
export function formatToBeijingTime(date: Date | null | undefined): string {
  return formatToTimezone(date, 8);
}
