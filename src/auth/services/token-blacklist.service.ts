/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-02 04:05:06
 * @FilePath: /lulab_backend/src/auth/services/token-blacklist.service.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@/redis/redis.service';
import { TokenBlacklistScope } from '@/auth/types/jwt.types';

// Blacklist store backed exclusively by Redis.
// Fail-closed: when Redis is unavailable, all writes and reads throw
// ServiceUnavailableException so callers cannot silently accept tokens
// whose revocation state cannot be verified.
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  private static extractJtiExp(decoded: unknown): {
    jti?: string;
    exp?: number;
  } {
    if (typeof decoded !== 'object' || decoded === null) return {};
    const rec = decoded as Record<string, unknown>;
    const jti = typeof rec.jti === 'string' ? rec.jti : undefined;
    const exp = typeof rec.exp === 'number' ? rec.exp : undefined;
    return { jti, exp };
  }

  private composeKey(scope: TokenBlacklistScope, jti: string): string {
    return `jwt:blacklist:${scope}:${jti}`;
  }

  // Fail-closed: refuse to proceed when Redis is not ready, so that
  // revocation state is never silently missing.
  private requireRedis(): NonNullable<ReturnType<RedisService['getClient']>> {
    if (!this.redis.isReady()) {
      throw new ServiceUnavailableException(
        'Token blacklist store (Redis) is unavailable',
      );
    }
    const client = this.redis.getClient();
    if (!client) {
      throw new ServiceUnavailableException(
        'Token blacklist store (Redis) is unavailable',
      );
    }
    return client;
  }

  // Add a token's jti to blacklist until its expiry
  async add(
    token: string,
    scope: TokenBlacklistScope = TokenBlacklistScope.AccessToken,
  ): Promise<{ jti?: string; added: boolean }> {
    const decoded: unknown = this.jwtService.decode(token);
    const { jti, exp: expSec } = TokenBlacklistService.extractJtiExp(decoded);
    if (!jti || !expSec) return { jti, added: false };

    const nowMs = Date.now();
    const expiresAtMs = expSec * 1000;
    const ttlMs = expiresAtMs - nowMs;
    if (ttlMs <= 0) return { jti, added: false };

    const ttlSec = Math.max(Math.floor(ttlMs / 1000), 1);
    const key = this.composeKey(scope, jti);
    const client = this.requireRedis();

    try {
      await client.set(key, '1', 'EX', ttlSec);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Redis set failed: ${msg}`);
      throw new ServiceUnavailableException(
        'Token blacklist store (Redis) write failed',
      );
    }
    return { jti, added: true };
  }

  // Add a jti directly to blacklist (without decoding a token string)
  // Used for batch-blacklisting access tokens of other devices on password reset
  async addJti(
    jti: string,
    ttlSec: number,
    scope: TokenBlacklistScope = TokenBlacklistScope.AccessToken,
  ): Promise<boolean> {
    if (ttlSec <= 0) return false;

    const key = this.composeKey(scope, jti);
    const ttl = Math.max(ttlSec, 1);
    const client = this.requireRedis();

    try {
      await client.set(key, '1', 'EX', ttl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Redis set failed: ${msg}`);
      throw new ServiceUnavailableException(
        'Token blacklist store (Redis) write failed',
      );
    }
    return true;
  }

  // Check if a jti is blacklisted
  async isTokenBlacklisted(
    jti: string,
    scope: TokenBlacklistScope = TokenBlacklistScope.AccessToken,
  ): Promise<boolean> {
    const key = this.composeKey(scope, jti);
    const client = this.requireRedis();

    try {
      const exists = await client.exists(key);
      return exists === 1;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Redis exists failed: ${msg}`);
      throw new ServiceUnavailableException(
        'Token blacklist store (Redis) read failed',
      );
    }
  }
}
