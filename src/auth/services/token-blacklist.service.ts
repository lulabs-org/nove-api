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

import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@/redis/redis.service';
import { TokenBlacklistScope } from '@/auth/types/jwt.types';

// A lightweight in-memory blacklist with TTL
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly local = new Map<string, number>(); // scope+jti -> expiresAt(ms) (fallback)

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

  // Add a token's jti to blacklist until its expiry
  async add(
    token: string,
    scope: TokenBlacklistScope = TokenBlacklistScope.AccessToken,
  ): Promise<{ jti?: string; added: boolean }> {
    const decoded: unknown = this.jwtService.decode(token);
    const { jti, exp: expSec } = TokenBlacklistService.extractJtiExp(decoded);
    if (!jti || !expSec) return { jti, added: false };

    const expiresAtMs = expSec * 1000;
    if (expiresAtMs <= Date.now()) return { jti, added: false };

    await this.writeEntry(this.composeKey(scope, jti), expiresAtMs);
    return { jti, added: true };
  }

  // Blacklist a known jti directly until expiresAtMs (batch user/device revocation)
  async addByJti(
    jti: string,
    expiresAtMs: number,
    scope: TokenBlacklistScope = TokenBlacklistScope.AccessToken,
  ): Promise<boolean> {
    if (expiresAtMs <= Date.now()) return false;

    await this.writeEntry(this.composeKey(scope, jti), expiresAtMs);
    return true;
  }

  // Persist one blacklist entry to Redis, with in-memory fallback on failure
  private async writeEntry(key: string, expiresAtMs: number): Promise<void> {
    const ttlMs = expiresAtMs - Date.now();
    const ttlSec = Math.max(Math.floor(ttlMs / 1000), 1);

    if (this.redis.isReady()) {
      try {
        // Wait for Redis operation to complete
        await this.redis.getClient()!.set(key, '1', 'EX', ttlSec);
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Redis set failed: ${msg}`);
        // Fallback to in-memory map with scheduled cleanup
      }
    }
    // Fallback to in-memory map with scheduled cleanup
    this.local.set(key, expiresAtMs);
    setTimeout(() => this.local.delete(key), ttlMs).unref?.();
  }

  // Check if a jti is blacklisted
  async isTokenBlacklisted(
    jti: string,
    scope: TokenBlacklistScope = TokenBlacklistScope.AccessToken,
  ): Promise<boolean> {
    const key = this.composeKey(scope, jti);
    if (this.redis.isReady()) {
      try {
        const exists = await this.redis.getClient()!.exists(key);
        return exists === 1;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Redis exists failed: ${msg}`);
        // Conservative fallback to local cache if present
      }
    }
    const expiresAt: number | undefined = this.local.get(key);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
      this.local.delete(key);
      return false;
    }
    return true;
  }
}
