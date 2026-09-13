/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-04 16:00:00
 * @Description: 客户端请求上下文装饰器（IP、User-Agent、Bearer Token 等）
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { HttpUtil } from '@/common/utils/http.util';

export interface ClientInfoContext {
  ip: string;
  userAgent?: string;
}

/**
 * 提取客户端请求上下文（IP 与 User-Agent）
 */
export const ClientInfo = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientInfoContext => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return {
      ip: HttpUtil.getClientIp(req),
      userAgent: req.get('User-Agent'),
    };
  },
);

/**
 * 从请求头 Authorization 中提取原始 Bearer Token
 */
export const BearerToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const authHeader = req.get('authorization') || req.get('Authorization');
    return authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : undefined;
  },
);
