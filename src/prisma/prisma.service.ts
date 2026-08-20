/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-06-27 05:27:02
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-01 05:04:14
 * @FilePath: /lulab_backend/src/prisma/prisma.service.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // Prisma 7 起使用 driver adapter（Rust-free）；Prisma 6.x 亦兼容。
    // 连接串由 @nestjs/config 在模块初始化时从 .env 载入 process.env。
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({
      adapter,
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  async onModuleInit() {
    await this.$connect();
  }
}
