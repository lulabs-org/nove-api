/**
 * @RequireAuth 装饰器
 * 限制路由只允许指定的认证方式访问
 *
 * @example
 * ```typescript
 * // 仅允许 JWT 认证
 * @RequireAuth('jwt')
 * @Post('change-password')
 * async changePassword() { ... }
 *
 * // 允许 JWT 或 API Key（默认行为，不需要装饰器）
 * @Get('meetings')
 * async getMeetings() { ... }
 * ```
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { SetMetadata } from '@nestjs/common';
import { AuthMethod } from './auth-context.interface';

export const REQUIRE_AUTH_KEY = 'requireAuth';

/**
 * 限制路由只允许指定的认证方式
 * @param methods 允许的认证方式列表
 */
export const RequireAuth = (...methods: AuthMethod[]) =>
  SetMetadata(REQUIRE_AUTH_KEY, methods);
