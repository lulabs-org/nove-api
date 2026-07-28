export const WECHAT_ORDER_MAX_RANGE_SECONDS = 7 * 24 * 60 * 60;
export const DEFAULT_WECHAT_ORDER_PAGE_SIZE = 100;

export interface WechatOrderUnixRange {
  startTime: number;
  endTime: number;
}

export function toUnixSeconds(value: string | Date): number {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
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
 * 内部按秒切片，并让相邻片段首尾相接，完整覆盖请求区间。
 * 如果外部接口在边界返回重复订单，订单 externalId 幂等 upsert 会消化重复数据。
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
