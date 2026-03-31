/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 15:10:02
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-19 12:19:37
 * @FilePath: /nove_api/src/api-key/guards/api-key-mcp-auth.guard.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService } from '@/api-key/services/api-key.service';
import type { ApiKeyUser } from '@/auth/decorators/api-key-user.decorator';
import { RoleService } from '@/role/services/role.service';
import { PermService } from '@/permission/services/permission.service';

type ApiKeyAuthContext = {
  orgId: string;
  apiKeyId: string;
  scopes: string[];
  userId: string | null;
};

declare module 'express' {
  interface Request {
    apiAuth?: ApiKeyAuthContext;
  }
}

@Injectable()
export class McpAuthJwtGuard implements CanActivate {
  private readonly logger = new Logger(McpAuthJwtGuard.name);

  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly roleService: RoleService,
    private readonly permService: PermService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const rawKey = this.extractKey(req);

    if (!rawKey) {
      return true;
    }

    let authContext: ApiKeyAuthContext;
    try {
      authContext = await this.apiKeyService.verifyKey(rawKey);
    } catch (error) {
      this.logger.warn(
        'API key verification failed',
        error instanceof Error ? error.message : String(error),
      );
      throw new UnauthorizedException('Invalid API key');
    }

    req.apiAuth = authContext;

    const [roles, validScopes] = await Promise.all([
      authContext.userId
        ? this.roleService.getUserRoles(authContext.userId)
        : Promise.resolve([]),
      this.filterScopesByPermissions(authContext.userId, authContext.scopes),
    ]);

    req.user = {
      authType: 'api_key',
      id: authContext.apiKeyId,
      sub: authContext.userId || '',
      orgId: authContext.orgId,
      apiKeyId: authContext.apiKeyId,
      scopes: validScopes,
      roles: roles.map((role) => role.code),
    } as ApiKeyUser;

    return true;
  }

  private async filterScopesByPermissions(
    userId: string | null,
    scopes: string[],
  ): Promise<string[]> {
    if (!userId) {
      return scopes;
    }

    try {
      const userPerm = await this.permService.getPermByUserId(userId);
      return scopes.filter((scope) => userPerm.includes(scope));
    } catch (error) {
      this.logger.warn(
        `Failed to get permissions for user ${userId}, returning all scopes`,
        error instanceof Error ? error.message : String(error),
      );
      return scopes;
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
      return Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    }

    return null;
  }
}
