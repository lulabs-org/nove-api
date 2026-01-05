import { registerAs, ConfigType } from '@nestjs/config';

/**
 * API Key 配置
 */
export const apiKeyConfig = registerAs('apiKey', () => ({
  /**
   * API Key 哈希密钥（用于 HMAC-SHA256）
   * 必须设置强随机密钥（最少 32 字符）
   */
  secret:
    process.env.API_KEY_SECRET ??
    (() => {
      throw new Error(
        'API_KEY_SECRET environment variable is required. Please set a strong random secret key (minimum 32 characters).',
      );
    })(),

  /**
   * 环境标识（用于 key 格式：sk_<env>_<prefix>.<secret>）
   */
  environment: process.env.NODE_ENV ?? 'dev',
}));

export type ApiKeyConfig = ConfigType<typeof apiKeyConfig>;
