/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-07-06 05:06:37
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-09-16 13:13:00
 * @FilePath: /nove_api/src/app.service.ts
 * @Description: Application service for core routing and health checks
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { HealthCheckResponseDto, HealthStatus } from './dto/app.dto';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  // 探针结果内存短缓存（3秒）：阻断高频并发对数据库连接池的瞬时冲击
  private cachedStatus?: HealthStatus;
  private lastCheckTime = 0;
  private readonly CACHE_TTL_MS = 3000;

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Database query error';
      this.logger.error(`Database health check failed: ${message}`);
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const client = this.redisService?.getClient();
      if (!client) {
        return true; // Redis 未配置时不阻断服务
      }
      await client.ping();
      return true;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Redis ping error';
      this.logger.error(`Redis health check failed: ${message}`);
      return false;
    }
  }

  async getHealthCheck(): Promise<HealthCheckResponseDto> {
    const now = Date.now();

    // 命中 3 秒内存缓存直接复用状态，仅刷新当前时间戳，完全无需再次查询数据库/Redis
    if (this.cachedStatus && now - this.lastCheckTime < this.CACHE_TTL_MS) {
      return {
        status: this.cachedStatus,
        timestamp: new Date().toISOString(),
      };
    }

    const [databaseOk, redisOk] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    // 数据库为系统核心强依赖，连通失败则置为 error；日志记录内部异常，对外不泄露
    const status: HealthStatus = databaseOk && redisOk ? 'ok' : 'error';

    this.cachedStatus = status;
    this.lastCheckTime = now;

    return {
      status,
      timestamp: new Date().toISOString(),
    };
  }
}
