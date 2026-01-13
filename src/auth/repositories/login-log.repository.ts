/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-28 11:37:14
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-14 02:18:49
 * @FilePath: /nove_api/src/auth/repositories/login-log.repository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { LoginType } from '@/auth/enums';

@Injectable()
export class LoginLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  countLoginFailuresByTargetSince(
    target: string,
    since: Date,
  ): Promise<number> {
    return this.prisma.loginLog.count({
      where: { target, success: false, createdAt: { gte: since } },
    });
  }

  countLoginFailuresByIpSince(ip: string, since: Date): Promise<number> {
    return this.prisma.loginLog.count({
      where: { ip, success: false, createdAt: { gte: since } },
    });
  }

  async createLoginLog(data: {
    userId: string | null;
    target: string;
    loginType: LoginType;
    success: boolean;
    ip: string;
    userAgent?: string;
    failReason?: string;
  }): Promise<void> {
    await this.prisma.loginLog.create({
      data: {
        userId: data.userId,
        target: data.target,
        loginType: data.loginType,
        success: data.success,
        ip: data.ip,
        userAgent: data.userAgent,
        failReason: data.failReason,
      },
    });
  }
}
