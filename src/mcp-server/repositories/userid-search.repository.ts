/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-13 09:02:15
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-10 02:40:31
 * @FilePath: /nove_api/src/mcp-server/repositories/userid-search.repository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UserSearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async byUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
  }

  async byPhone(countryCode: string, phone: string) {
    return this.prisma.user.findFirst({
      where: { countryCode, phone },
      select: { id: true },
    });
  }

  async byEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }
}
