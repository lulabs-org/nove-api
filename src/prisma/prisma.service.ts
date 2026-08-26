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

import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const logLevels: Prisma.LogLevel[] =
      process.env.NODE_ENV === 'production'
        ? ['warn', 'error']
        : ['query', 'info', 'warn', 'error'];

    super({
      log: logLevels,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
