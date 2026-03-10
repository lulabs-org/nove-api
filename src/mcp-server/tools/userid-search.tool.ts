/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-14 13:14:26
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-10 02:37:47
 * @FilePath: /nove_api/src/mcp-server/tools/userid-search.tool.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { ToolScopes } from '@rekog/mcp-nest';
import { UserSearchRepository } from '../repositories/userid-search.repository';

@Injectable()
export class UserSearchTool {
  constructor(private readonly userIdSearchRepos: UserSearchRepository) {}

  @Tool({
    name: 'find-userid-by-username',
    description: 'Find user ID by username',
    parameters: z.object({
      username: z.string().describe('The username to search for'),
    }),
  })
  @ToolScopes(['mcp-tool:userid-search'])
  async findUserByUsername({ username }: { username: string }) {
    const user = await this.userIdSearchRepos.byUsername(username);

    if (!user) {
      return {
        status: 'error',
        message: `User ID not found with username: ${username}`,
        userId: null,
      };
    }

    return {
      userId: user.id,
      status: 'success',
      message: 'User ID found successfully',
    };
  }

  @Tool({
    name: 'find-userid-by-phone',
    description: 'Find user ID by phone number',
    parameters: z.object({
      countryCode: z.string().describe('Country code (e.g., +86)'),
      phone: z.string().describe('Phone number'),
    }),
  })
  @ToolScopes(['mcp-tool:userid-search'])
  async findUserByPhone({
    countryCode,
    phone,
  }: {
    countryCode: string;
    phone: string;
  }) {
    const user = await this.userIdSearchRepos.byPhone(countryCode, phone);

    if (!user) {
      return {
        status: 'error',
        message: `User ID not found with phone: ${countryCode}${phone}`,
        userId: null,
      };
    }

    return {
      userId: user.id,
      status: 'success',
      message: 'User ID found successfully',
    };
  }

  @Tool({
    name: 'find-userid-by-email',
    description: 'Find user ID by email address',
    parameters: z.object({
      email: z.string().email().describe('The email address to search for'),
    }),
  })
  @ToolScopes(['mcp-tool:userid-search'])
  async findUserByEmail({ email }: { email: string }) {
    const user = await this.userIdSearchRepos.byEmail(email);

    if (!user) {
      return {
        status: 'error',
        message: `User ID not found with email: ${email}`,
        userId: null,
      };
    }

    return {
      userId: user.id,
      status: 'success',
      message: 'User ID found successfully',
    };
  }
}
