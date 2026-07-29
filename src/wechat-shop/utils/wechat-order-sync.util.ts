export const MAX_TIME_RANGE_SECONDS = 7 * 24 * 60 * 60;

export interface WechatOrderUnixRange {
  startTime: number;
  endTime: number;
}


/**
 * 微信订单列表接口限制单次时间范围不超过 7 天。
 *
 * 内部按秒切片。通过游标 + 1 的方式严格划分边界，
 * 避免了相邻切片的时间重叠，从而消除了重复拉取和数据库冗余 upsert。
 */
export function splitTimeRanges(
  startTime: number,
  endTime: number,
): WechatOrderUnixRange[] {
  const ranges: WechatOrderUnixRange[] = [];
  let cursor = startTime;

  while (cursor <= endTime) {
    const rangeEnd = Math.min(cursor + MAX_TIME_RANGE_SECONDS, endTime);
    ranges.push({ startTime: cursor, endTime: rangeEnd });
    cursor = rangeEnd + 1; // +1 避免与下一个片段的 startTime 重叠
  }

  return ranges;
}
