/**
 * 统一认证上下文
 * 将 JWT 和 API Key 两种认证方式归一化为统一的身份上下文
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import type { AuthenticatedUser } from './jwt.types';

/**
 * 认证方式枚举
 */
export type AuthMethod = 'jwt' | 'api_key' | 'oauth';

/**
 * 统一认证上下文接口
 * 无论使用 JWT 还是 API Key 认证，最终都会解析为此结构
 */
export interface AuthContext {
  /** 认证方式 */
  authMethod: AuthMethod;

  /** 用户 ID（JWT: 当前用户; API Key: 创建者） */
  userId: string | null;

  /** 组织 ID（JWT: 通过 UserOrgService 解析; API Key: 直接从 key 获取） */
  orgId: string | null;

  /** 权限列表（JWT: 通过角色解析; API Key: scopes） */
  permissions: string[];

  /** API Key ID（仅 API Key 认证时有值） */
  apiKeyId?: string;

  /** OAuth client ID（仅 OAuth delegated access token 时有值） */
  oauthClientId?: string;

  /** 当前鉴权的用户实体镜像（仅在 JWT / OAuth 认证时存在） */
  user?: AuthenticatedUser;
}

/**
 * 扩展 Express Request 类型以包含统一认证上下文
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * 统一认证上下文（由 UnifiedAuthGuard 注入）
       */
      authContext?: AuthContext;
    }
  }
}

export {};
