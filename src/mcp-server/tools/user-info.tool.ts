/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 02:24:26
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 19:00:54
 * @FilePath: /nove_api/src/mcp-server/tools/user-info.tool.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { PrismaService } from '@/prisma/prisma.service';
import { PublicTool, ToolScopes, ToolRoles } from '@rekog/mcp-nest';

@Injectable()
export class UserInfoTool {
  constructor(private readonly prisma: PrismaService) {}

  @Tool({
    name: 'get-user-info',
    description: 'Get user information by user ID',
    parameters: z.object({
      userId: z.string().describe('The ID of the user to fetch'),
    }),
  })
  @ToolScopes(['mcp:all'])
  async getUserInfo({ userId }: { userId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return {
        userId,
        status: 'error',
        message: `User not found with ID: ${userId}`,
        data: null,
      };
    }

    return {
      userId: user.id,
      status: 'success',
      message: 'User info retrieved successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        countryCode: user.countryCode,
        phone: user.phone,
        emailVerified: !!user.emailVerifiedAt,
        phoneVerified: !!user.phoneVerifiedAt,
        active: user.active,
        lastLoginAt: user.lastLoginAt?.toISOString(),
        createdAt: user.createdAt.toISOString(),
        profile: user.profile
          ? {
              displayName: user.profile.displayName,
              avatar: user.profile.avatar,
              bio: user.profile.bio,
              firstName: user.profile.firstName,
              lastName: user.profile.lastName,
              dateOfBirth: user.profile.dateOfBirth?.toISOString(),
              gender: user.profile.gender,
              city: user.profile.city,
              country: user.profile.country,
            }
          : null,
      },
    };
  }
}
