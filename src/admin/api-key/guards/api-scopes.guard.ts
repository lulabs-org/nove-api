import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { API_SCOPES_KEY } from '../decorators/api-scopes.decorator';

/**
 * API Scopes 授权守卫
 * 验证 API Key 是否具有所需的权限范围
 */
@Injectable()
export class ApiScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取路由所需的 scopes
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      API_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有定义所需 scopes，则允许访问
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authContext = request.apiAuth;

    // 如果没有认证上下文，说明没有通过 ApiKeyGuard
    if (!authContext) {
      throw new ForbiddenException('Authentication context missing');
    }

    // 验证 API Key 是否包含所有所需的 scopes
    const hasAllScopes = requiredScopes.every((scope) =>
      authContext.scopes.includes(scope),
    );

    if (!hasAllScopes) {
      throw new ForbiddenException('Insufficient scopes');
    }

    return true;
  }
}
