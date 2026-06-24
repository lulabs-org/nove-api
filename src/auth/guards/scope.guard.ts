import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_SCOPE_KEY } from '../decorators/require-scope.decorator';
import { Request } from 'express';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有要求 scope，直接放行
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    // 我们假设 JWT payload 会被提取并在 request.user 中带上 scope，或者我们在 AuthContext 中存一份
    // 这里的实现依赖于我们如何在 JwtStrategy 中把 scopes 解析并绑定到 user 对象上
    const user = (request as any).user;
    
    if (!user) {
      return false; // 用户未认证
    }

    // 假设 scope 被解析为一个字符串数组或者空格分隔的字符串挂载在 user.scope 或 user.scopes 上
    // 实际需要根据 JwtPayload 中的 `scp` 字段获取
    const userScopes: string[] = user.scopes || [];

    // 验证用户（或其第三方应用授权的 token）是否包含所有必需的 scope
    const hasAllRequiredScopes = requiredScopes.every((scope) =>
      userScopes.includes(scope),
    );

    if (!hasAllRequiredScopes) {
      throw new ForbiddenException(
        `Insufficient scopes. Required scopes: ${requiredScopes.join(', ')}`,
      );
    }

    return true;
  }
}
