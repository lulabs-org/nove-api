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
