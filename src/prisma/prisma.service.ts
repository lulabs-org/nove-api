/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-06-27 05:27:02
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-31 01:32:21
 * @FilePath: /nove_api/src/prisma/prisma.service.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import './load-prisma-env';

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@/generated/prisma/client';
import { createPrismaAdapter } from './prisma-adapter';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const logLevels: Prisma.LogLevel[] =
      process.env.NODE_ENV === 'production'
        ? ['warn', 'error']
        : ['query', 'info', 'warn', 'error'];

    super({
      log: logLevels,
      adapter: createPrismaAdapter(),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async onModuleInit() {
    await this.$connect();
    // Driver adapters create pools lazily; verify connectivity at startup.
    await this.$queryRaw`SELECT 1`;
  }
}
