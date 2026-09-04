/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-23 02:15:08
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-11-23 18:38:40
 * @FilePath: /lulab_backend/src/lark-meeting/time.util.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

/**
 * 将时间转换为毫秒
 * @param v 时间值，支持数字（秒）、字符串（秒）、Date 对象
 * @returns 毫秒值或 undefined（如果输入无效）
 *
 */
export const toMs = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v < 10000000000 ? v * 1000 : v;
  }
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) {
      return n < 10000000000 ? n * 1000 : n;
    }
  }
  if (v instanceof Date) {
    return v.getTime();
  }
  return undefined;
};
