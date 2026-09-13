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

import { Injectable, Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import { RedisService } from '@/redis/redis.service';
import { TokenBlacklistScope } from '@/auth/types/jwt.types';
import { jwtConfig } from '@/configs/jwt.config';
import { parseDurationToMs } from '@/common/utils';

// A lightweight in-memory blacklist with TTL
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly local = new Map<string, number>(); // scope+jti -> expiresAt(ms) (fallback)

  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
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

  private composeUserRevokedKey(userId: string): string {
    return `jwt:user_revoked_before:${userId}`;
  }

  // 用户级撤销：令某时间点之前签发的所有 access token 立即失效。
  // 标记 TTL 与 access token 最长生命周期对齐（届时受影响 token 均已自然过期），
  // 到期由 Redis 自动清理。写侧 fail-closed：Redis 不可用或写入失败时显式返回
  // added=false，不再退化为进程内存兜底（多实例不可见、重启即丢，会造成
  // "报告撤销成功但实际未生效"的假象）。
  async setUserRevokedBefore(
    userId: string,
  ): Promise<{ revokedBefore: number; added: boolean }> {
    const nowMs = Date.now();
    const ttlSec = Math.max(
      Math.ceil(parseDurationToMs(this.config.accessExpiresIn) / 1000),
      1,
    );
    const key = this.composeUserRevokedKey(userId);

    if (this.redis.isReady()) {
      try {
        await this.redis.getClient()!.set(key, String(nowMs), 'EX', ttlSec);
        return { revokedBefore: nowMs, added: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Redis set failed: ${msg}`);
      }
    } else {
      this.logger.warn('Redis not ready, user-level revocation skipped');
    }
    return { revokedBefore: nowMs, added: false };
  }

  // 校验某用户在 iatSec（秒）及之前签发的 token 是否已被用户级撤销。
  // 读侧以 Redis 为唯一事实源：无标记或读取失败均视为未撤销（fail-open），
  // 由写侧的 fail-closed 保证标记要么真实写入、要么向上层显式报告失败。
  async isUserRevokedBefore(userId: string, iatSec: number): Promise<boolean> {
    const key = this.composeUserRevokedKey(userId);

    if (this.redis.isReady()) {
      try {
        const raw = await this.redis.getClient()!.get(key);
        if (raw === null) return false;
        const revokedBeforeMs = Number(raw);
        if (Number.isNaN(revokedBeforeMs)) return false;
        // 用 <= 而非 <：同一秒内先签发后撤销的 token 也拒绝（fail-closed）
        return iatSec * 1000 <= revokedBeforeMs;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Redis get failed: ${msg}`);
        return false;
      }
    }
    return false;
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

    if (this.redis.isReady()) {
      try {
        // Wait for Redis operation to complete
        await this.redis.getClient()!.set(key, '1', 'EX', ttlSec);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Redis set failed: ${msg}`);
        // Fallback to in-memory map with scheduled cleanup
        this.local.set(key, expiresAtMs);
        setTimeout(() => this.local.delete(key), ttlMs).unref?.();
      }
    } else {
      // Fallback to in-memory map with scheduled cleanup
      this.local.set(key, expiresAtMs);
      setTimeout(() => this.local.delete(key), ttlMs).unref?.();
    }
    return { jti, added: true };
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
