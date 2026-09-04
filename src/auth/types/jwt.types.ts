/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-28 11:37:14
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-09 01:33:47
 * @FilePath: /lulab_backend/src/auth/types/jwt.types.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
export interface AuthenticatedUser {
  id: string;
  username?: string | null;
  email: string;
  phone?: string | null;
  countryCode?: string | null;
  profile?: Record<string, unknown> | null;
  roles?: string[];
  active: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  lastLoginAt?: Date | null;
  scopes?: string[];
  tokenUse?: 'oauth_access';
  clientId?: string;
  organizationId?: string;
  credentialVersion?: number;
}

export interface ApiKeyUser {
  id: string;
  sub: string; // user_id
  orgId: string;
  apiKeyId: string;
  scopes: string[];
  roles?: string[];
  authType: 'api_key';
}

export interface JwtPayload {
  sub: string;
  username?: string;
  email?: string;
  jti?: string;
  iat?: number;
  exp?: number;
  scopes?: string[];
  token_use?: 'oauth_access';
  client_id?: string;
  org_id?: string;
  credential_version?: number;
}

export enum TokenBlacklistScope {
  AccessToken = 'access',
  RefreshToken = 'refresh',
}

export enum ClientType {
  Web = 'web',
  App = 'app',
}

// Abstraction for JWT strategy to fetch and validate users without DB coupling
export interface JwtUserLookup {
  // Return an AuthenticatedUser or null if not found/invalid
  getAuthenticatedUserById(id: string): Promise<AuthenticatedUser | null>;
}

// Injection token for providing JwtUserLookup implementation from the app layer
export const JWT_USER_LOOKUP = Symbol('JWT_USER_LOOKUP');

// Optional token blacklist check used by JWT strategy
export interface JwtTokenBlacklist {
  isTokenBlacklisted(
    jti: string,
    scope?: TokenBlacklistScope,
  ): Promise<boolean> | boolean;

  // 用户级撤销边界：签发时间（iat，秒）不晚于该边界的 token 均视为已撤销。
  // 用于全端登出/密码重置等需要批量失效 access token 的场景。
  isUserRevokedBefore?(
    userId: string,
    iatSec: number,
  ): Promise<boolean> | boolean;
}

// Injection token for providing a token blacklist implementation from the app layer
export const JWT_TOKEN_BLACKLIST = Symbol('JWT_TOKEN_BLACKLIST');
