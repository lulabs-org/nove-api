/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-14 00:29:07
 * @FilePath: /nove_api/src/auth/decorators/user.decorator.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUser {
  id: string;
  username?: string;
  email: string;
  phone?: string;
  countryCode?: string;
  profile?: Record<string, unknown>;
  roles?: string[];
  active: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  lastLoginAt?: Date | null;
}

interface RequestWithUser {
  user?: CurrentUser;
}

export const User = createParamDecorator(
  (data: keyof CurrentUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
