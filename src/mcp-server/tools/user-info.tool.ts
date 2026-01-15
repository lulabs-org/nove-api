/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 02:24:26
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 18:41:38
 * @FilePath: /nove_api/src/mcp-server/tools/user-info.tool.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { Tool, ToolScopes, Context } from '@rekog/mcp-nest';
import { z } from 'zod';
import { PrismaService } from '@/prisma/prisma.service';
import type { McpRequestWithUser, McpUserPayload } from '@rekog/mcp-nest';

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
  @ToolScopes(['mcp-tool:user-info'])
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

  @Tool({
    name: 'get-current-user-info',
    description:
      'Get current authenticated user information from authorization context',
    parameters: z
      .object({})
      .describe(
        'No parameters required - uses authenticated user from request',
      ),
  })
  @ToolScopes(['mcp-tool:current-user-info'])
  async getCurrentUserInfo(
    _args: Record<string, unknown>,
    _context: Context,
    httpRequest: McpRequestWithUser,
  ) {
    const user = httpRequest.user as McpUserPayload | undefined;

    if (!user) {
      return {
        status: 'error',
        message:
          'No authenticated user found. Please provide valid authentication credentials.',
        data: null,
      };
    }

    const userId = user.sub;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!dbUser) {
      return {
        userId,
        status: 'error',
        message: `User not found with ID: ${userId}`,
        data: null,
      };
    }

    return {
      userId: dbUser.id,
      status: 'success',
      message: 'Current user info retrieved successfully',
      data: {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        countryCode: dbUser.countryCode,
        phone: dbUser.phone,
        emailVerified: !!dbUser.emailVerifiedAt,
        phoneVerified: !!dbUser.phoneVerifiedAt,
        active: dbUser.active,
        lastLoginAt: dbUser.lastLoginAt?.toISOString(),
        createdAt: dbUser.createdAt.toISOString(),
        profile: dbUser.profile
          ? {
              displayName: dbUser.profile.displayName,
              avatar: dbUser.profile.avatar,
              bio: dbUser.profile.bio,
              firstName: dbUser.profile.firstName,
              lastName: dbUser.profile.lastName,
              dateOfBirth: dbUser.profile.dateOfBirth?.toISOString(),
              gender: dbUser.profile.gender,
              city: dbUser.profile.city,
              country: dbUser.profile.country,
            }
          : null,
      },
    };
  }
}
