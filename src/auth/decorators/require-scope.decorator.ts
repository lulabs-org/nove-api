import { SetMetadata } from '@nestjs/common';

export const REQUIRE_SCOPE_KEY = 'requireScope';

/**
 * 限制路由只允许拥有特定 OAuth Scope 的请求访问
 * 如果使用了此装饰器，请求的 JWT 必须包含指定的 scope 之一（或全部，由 Guard 逻辑决定，通常是全部）
 * @param scopes 要求的 Scope 列表
 */
export const RequireScope = (...scopes: string[]) =>
  SetMetadata(REQUIRE_SCOPE_KEY, scopes);
