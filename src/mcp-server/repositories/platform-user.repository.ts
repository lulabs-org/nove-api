/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-18 14:04:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-18 14:04:01
 * @FilePath: /nove_api/src/mcp-server/repositories/platform-user.repository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { PlatformUser } from '@prisma/client';

@Injectable()
export class PlatformUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveUsers(localUserId: string): Promise<PlatformUser[]> {
    return this.prisma.platformUser.findMany({
      where: {
        localUserId,
        active: true,
        deletedAt: null,
      },
    });
  }
}
