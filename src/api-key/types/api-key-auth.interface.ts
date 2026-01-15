/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 14:56:17
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 17:56:29
 * @FilePath: /nove_api/src/api-key/types/api-key-auth.interface.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
/**
 * API Key 认证上下文接口
 * 在请求通过 API Key 认证后，此上下文会被附加到 request 对象上
 */
export interface ApiKeyAuthContext {
  /**
   * 组织 ID（多租户隔离）
   */
  organizationId: string;

  /**
   * API Key ID
   */
  apiKeyId: string;

  /**
   * 权限范围
   */
  scopes: string[];

  /**
   * 用户 ID（API Key 创建者）
   */
  userId: string | null;
}

/**
 * 扩展 Express Request 类型以包含 API Key 认证上下文
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * API Key 认证上下文
       */
      apiAuth?: ApiKeyAuthContext;
    }
  }
}

export {};
