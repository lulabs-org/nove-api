/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-14 00:35:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-14 11:29:27
 * @FilePath: /lulab_backend/src/common/utils/http.util.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Request } from 'express';

export class HttpUtil {
  static getClientIp(req: Request): string {
    const xff = req.headers['x-forwarded-for'];
    const xReal = req.headers['x-real-ip'];
    const forwarded = Array.isArray(xff) ? xff[0] : xff?.split(',')[0];
    const realIp = Array.isArray(xReal) ? xReal[0] : xReal;

    return (
      forwarded?.trim() ||
      realIp?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    );
  }
}
