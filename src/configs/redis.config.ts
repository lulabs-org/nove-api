/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 06:34:08
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-02 02:56:39
 * @FilePath: /lulab_backend/src/configs/redis.config.ts
 * @Description:
 *
 * Copyright (c) 2025 by 杨仕明 shiming.y@qq.com, All Rights Reserved.
 */

/**
 * Redis Configuration
 * Configuration for Redis connection settings
 */
import { registerAs, ConfigType } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => {
  const rawUrl = process.env.REDIS_URL;
  if (!rawUrl) {
    throw new Error('REDIS_URL must be defined');
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    throw new Error(
      `Invalid REDIS_URL format: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error(
      `Invalid REDIS_URL protocol: ${parsed.protocol}. Expected "redis:" or "rediss:".`,
    );
  }

  const host = parsed.hostname.replace(/^\[(.*)\]$/, '$1');
  const port = parsed.port ? Number(parsed.port) : 6379;

  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error('REDIS_URL contains an invalid port number');
  }

  const password = decodeURIComponent(parsed.password || '');
  const username = decodeURIComponent(parsed.username || '');

  const dbStr = parsed.pathname ? parsed.pathname.replace(/^\//, '') : '';
  if (dbStr && !/^\d+$/.test(dbStr)) {
    throw new Error('REDIS_URL contains an invalid database number');
  }
  const db = dbStr ? Number(dbStr) : 0;

  if (!Number.isSafeInteger(db) || db < 0) {
    throw new Error('REDIS_URL contains an invalid database number');
  }

  return {
    url: rawUrl,
    host,
    port,
    password,
    username,
    db,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  };
});

export type RedisConfig = ConfigType<typeof redisConfig>;
