/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 15:10:02
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-19 02:49:47
 * @FilePath: /nove_api/src/api-key/guards/api-key-mcp-auth.guard.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService } from '@/api-key/services/api-key.service';
import type { ApiKeyUser } from '@/auth/decorators/api-key-user.decorator';

type ApiKeyAuthContext = {
  orgId: string;
  apiKeyId: string;
  scopes: string[];
};

declare module 'express' {
  interface Request {
    apiAuth?: ApiKeyAuthContext;
  }
}

@Injectable()
export class McpAuthJwtGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const rawKey = this.extractKey(req);

    // ✅ 没有 key：交给 McpModule.allowUnauthenticatedAccess 决定能否继续
    // - allowUnauthenticatedAccess=true → 允许匿名进入（只能用 @PublicTool）
    // - allowUnauthenticatedAccess=false → 你也可以在这里直接 401（见下方可选严格模式）
    if (!rawKey) {
      return true;
    }

    try {
      const authContext = await this.apiKeyService.verifyKey(rawKey);

      // 兼容你原来的写法
      req.apiAuth = authContext;

      // ✅ 关键：把 scopes 等挂到 request.user
      // 这样 @ToolScopes(['admin']) 才能生效
      req.user = {
        authType: 'api_key',
        id: authContext.apiKeyId,
        sub: authContext.userId,
        orgId: authContext.orgId,
        apiKeyId: authContext.apiKeyId,
        scopes: authContext.scopes ?? [],
        roles: [],
      } as ApiKeyUser;

      return true;
    } catch {
      // 统一返回通用错误消息，防止信息泄露
      throw new UnauthorizedException('Invalid API key');
    }
  }

  /**
   * 支持两种方式：
   * 1) Authorization: Bearer <key>
   * 2) x-api-key: <key>
   */
  private extractKey(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }

    const apiKeyHeader = req.headers['x-api-key'];
    if (apiKeyHeader) {
      return (
        Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader
      ).trim();
    }

    return null;
  }
}
