/**
 * @Auth 装饰器
 * 从请求中提取统一认证上下文，替代原有的 @User() 装饰器
 *
 * @example
 * ```typescript
 * // 获取完整的认证上下文
 * @Get('profile')
 * async getProfile(@Auth() auth: AuthContext) {
 *   console.log(auth.userId, auth.orgId, auth.authMethod);
 * }
 *
 * // 获取单个字段
 * @Get('org')
 * async getOrg(@Auth('orgId') orgId: string) { ... }
 * ```
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext } from '../types/auth-context.interface';

interface RequestWithAuthContext {
  authContext?: AuthContext;
}

export const Auth = createParamDecorator(
  (data: keyof AuthContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuthContext>();
    const authContext = request.authContext;
    return data ? authContext?.[data] : authContext;
  },
);
