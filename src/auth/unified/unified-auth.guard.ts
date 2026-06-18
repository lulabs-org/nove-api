/**
 * 统一认证守卫
 * 替代全局 JwtAuthGuard，同时支持 JWT 和 API Key 认证
 *
 * 认证流程:
 * 1. 检查 @Public() → 跳过认证
 * 2. 检查 @RequireAuth() → 获取允许的认证方式
 * 3. 尝试提取 API Key (x-api-key header 或 Bearer sk_* 前缀)
 *    → 调用 ApiKeyService.verifyKey() → 构建 AuthContext
 * 4. 否则尝试 JWT (Authorization: Bearer <jwt>)
 *    → 调用 Passport JWT strategy → 构建 AuthContext
 * 5. 将 AuthContext 挂载到 request.authContext
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AuthContext, AuthMethod } from './auth-context.interface';
import { REQUIRE_AUTH_KEY } from './require-auth.decorator';
import { ApiKeyService } from '@/api-key/services/api-key.service';
import { UserOrgService } from '@/api-key/services/user-organization.service';
import { PermService } from '@/permission/services/permission.service';
import type { AuthenticatedUser } from '@/auth/types/jwt.types';

@Injectable()
export class UnifiedAuthGuard extends AuthGuard('jwt') implements CanActivate {
  private readonly logger = new Logger(UnifiedAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeyService: ApiKeyService,
    private readonly userOrgService: UserOrgService,
    private readonly permService: PermService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. 检查 @Public() 装饰器
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2. 获取允许的认证方式（@RequireAuth）
    const requiredMethods = this.reflector.getAllAndOverride<AuthMethod[]>(
      REQUIRE_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 3. 尝试 API Key 认证
    const rawApiKey = this.extractApiKey(request);
    if (rawApiKey) {
      if (requiredMethods && !requiredMethods.includes('api_key')) {
        throw new ForbiddenException(
          'This endpoint does not accept API key authentication',
        );
      }

      return this.handleApiKeyAuth(request, rawApiKey);
    }

    // 4. 尝试 JWT 认证
    if (requiredMethods && !requiredMethods.includes('jwt')) {
      throw new ForbiddenException(
        'This endpoint does not accept JWT authentication',
      );
    }

    return this.handleJwtAuth(context, request);
  }

  /**
   * 处理 API Key 认证
   */
  private async handleApiKeyAuth(
    request: Request,
    rawKey: string,
  ): Promise<boolean> {
    try {
      const apiKeyAuth = await this.apiKeyService.verifyKey(rawKey);

      const authContext: AuthContext = {
        authMethod: 'api_key',
        userId: apiKeyAuth.userId,
        orgId: apiKeyAuth.orgId,
        permissions: apiKeyAuth.scopes,
        apiKeyId: apiKeyAuth.apiKeyId,
      };

      request.authContext = authContext;

      // 保持 request.apiAuth 向后兼容
      request.apiAuth = apiKeyAuth;

      // 同时设置 request.user 以兼容现有代码
      // API Key 以创建者身份操作
      if (apiKeyAuth.userId) {
        (request as Request & { user?: unknown }).user = {
          id: apiKeyAuth.userId,
          authType: 'api_key',
        };
      }

      return true;
    } catch (error) {
      this.logger.warn(
        'API key verification failed',
        error instanceof Error ? error.message : String(error),
      );
      throw new UnauthorizedException('Invalid API key');
    }
  }

  /**
   * 处理 JWT 认证
   */
  private async handleJwtAuth(
    context: ExecutionContext,
    request: Request,
  ): Promise<boolean> {
    // 委托给 Passport JWT strategy
    const result = await (super.canActivate(context) as Promise<boolean>);
    if (!result) return false;

    const requestWithUser = request as Request & { user?: AuthenticatedUser };
    const user = requestWithUser.user;
    if (!user) return false;

    // 解析用户的组织和权限
    let orgId: string | null = null;
    let permissions: string[] = [];

    try {
      orgId = await this.userOrgService.getPrimaryOrgId(user.id);
    } catch (error) {
      this.logger.debug(
        `Could not resolve orgId for user ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    try {
      const roleCodes = user.roles || [];
      if (roleCodes.length > 0) {
        permissions = await this.permService.getPermByRoleCodes(roleCodes);
      }
    } catch (error) {
      this.logger.debug(
        `Could not resolve permissions for user ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const authContext: AuthContext = {
      authMethod: 'jwt',
      userId: user.id,
      orgId,
      permissions,
    };

    request.authContext = authContext;

    return true;
  }

  /**
   * 从请求中提取 API Key
   * 支持两种方式：
   * 1. x-api-key header
   * 2. Authorization: Bearer sk_* (以 sk_ 前缀区分 JWT)
   */
  private extractApiKey(request: Request): string | null {
    // 优先检查 x-api-key header
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    }

    // 检查 Authorization header 中是否为 API Key（以 sk_ 开头）
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer sk_')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * 覆盖 Passport 的 handleRequest 以提供更友好的错误消息
   */
  handleRequest<TUser = AuthenticatedUser>(
    err: Error | null,
    user: AuthenticatedUser | null | undefined,
  ): TUser {
    if (err) throw err;
    if (!user) throw new UnauthorizedException('访问令牌无效或已过期');
    return user as TUser;
  }
}
