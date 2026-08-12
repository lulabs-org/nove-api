import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for API scopes
 */
export const API_SCOPES_KEY = 'apiScopes';

/**
 * API Scopes 装饰器
 * 用于标记路由所需的权限范围
 *
 * @example
 * ```typescript
 * @Get('meetings')
 * @ApiScopes('meetings:read')
 * async getMeetings() {
 *   // ...
 * }
 *
 * @Post('meetings')
 * @ApiScopes('meetings:write', 'meetings:create')
 * async createMeeting() {
 *   // ...
 * }
 * ```
 */
export const ApiScopes = (...scopes: string[]) =>
  SetMetadata(API_SCOPES_KEY, scopes);
