/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-08 09:50:00
 * @Description: 当前组织（租户）参数装饰器，从请求认证上下文中提取 orgId 并校验有效性
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthContext } from '../types/auth-context.interface';

interface RequestWithAuthContext {
  authContext?: AuthContext;
}

/**
 * 提取当前组织 ID，若不存在或为空字符串则抛出 ForbiddenException('Current organization is required')
 */
export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuthContext>();
    const orgId = request.authContext?.orgId;
    if (!orgId?.trim()) {
      throw new ForbiddenException('Current organization is required');
    }
    return orgId;
  },
);
