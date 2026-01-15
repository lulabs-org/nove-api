/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-14 00:26:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 17:40:41
 * @FilePath: /nove_api/src/auth/decorators/api-key-user.decorator.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ApiKeyUser {
  id: string;
  sub: string; // user_id
  organizationId: string;
  apiKeyId: string;
  scopes: string[];
  roles?: string[];
  authType: 'api_key';
}

interface RequestWithApiKeyUser {
  user?: ApiKeyUser;
}

export const ApiKeyUser = createParamDecorator(
  (
    data: keyof ApiKeyUser | undefined,
    ctx: ExecutionContext,
  ): ApiKeyUser | ApiKeyUser[keyof ApiKeyUser] | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithApiKeyUser>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    if (!data) {
      return user;
    }

    return user[data];
  },
);
