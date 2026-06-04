import { BadRequestException } from '@nestjs/common';

export const WECHAT_ORDER_MAX_RANGE_SECONDS = 7 * 24 * 60 * 60;
export const DEFAULT_WECHAT_ORDER_PAGE_SIZE = 100;

export interface WechatOrderUnixRange {
  startTime: number;
  endTime: number;
}

export function toUnixSeconds(value: string | Date, fieldName: string): number {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new BadRequestException(`${fieldName} must be a valid ISO 8601 date`);
  }

  return Math.floor(timestamp / 1000);
}

export function unixSecondsToDate(value: number): Date {
  return new Date(value * 1000);
}

export function unixSecondsToISOString(value?: number): string | undefined {
  if (!value) return undefined;

  return new Date(value * 1000).toISOString();
}

/**
 * 微信订单列表接口限制单次时间范围不超过 7 天。
 *
 * 内部按秒切片，并让相邻片段在边界秒重叠。这样无论外部接口把
 * end_time 解释为闭区间还是半开区间，都不会漏掉边界订单；重复
 * 数据由订单 externalId 幂等 upsert 吃掉。
 */
export function splitWechatOrderRanges(
  startTime: number,
  endTime: number,
): WechatOrderUnixRange[] {
  const ranges: WechatOrderUnixRange[] = [];
  let cursor = startTime;

  while (cursor < endTime) {
    const rangeEnd = Math.min(cursor + WECHAT_ORDER_MAX_RANGE_SECONDS, endTime);
    ranges.push({ startTime: cursor, endTime: rangeEnd });
    cursor = rangeEnd;
  }

  return ranges;
}
