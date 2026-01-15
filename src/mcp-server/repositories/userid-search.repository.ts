/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-13 09:02:15
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-13 09:02:16
 * @FilePath: /nove_api/src/mcp-server/repositories/userid-search.repository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UserIdSearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserIdByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
  }

  async findUserIdByPhone(countryCode: string, phone: string) {
    return this.prisma.user.findFirst({
      where: { countryCode, phone },
      select: { id: true },
    });
  }

  async findUserIdByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  async searchUserIdsByUsername(username: string, limit: number) {
    return this.prisma.user.findMany({
      where: {
        username: {
          contains: username,
          mode: 'insensitive',
        },
      },
      select: { id: true },
      take: limit,
    });
  }

  async searchUserIdsByEmail(email: string, limit: number) {
    return this.prisma.user.findMany({
      where: {
        email: {
          contains: email,
          mode: 'insensitive',
        },
      },
      select: { id: true },
      take: limit,
    });
  }

  async searchUserIds(query: string, limit: number) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: { id: true },
      take: limit,
    });
  }
}
