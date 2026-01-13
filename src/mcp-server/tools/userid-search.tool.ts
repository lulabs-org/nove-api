import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { ToolScopes } from '@rekog/mcp-nest';
import { UserIdSearchRepository } from '../repositories/userid-search.repository';

@Injectable()
export class UserSearchTool {
  constructor(private readonly userIdSearchRepos: UserIdSearchRepository) {}

  @Tool({
    name: 'find-userid-by-username',
    description: 'Find user ID by username',
    parameters: z.object({
      username: z.string().describe('The username to search for'),
    }),
  })
  @ToolScopes(['mcp:all'])
  async findUserByUsername({ username }: { username: string }) {
    const user = await this.userIdSearchRepos.findUserIdByUsername(username);

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
  @ToolScopes(['mcp:all'])
  async findUserByPhone({
    countryCode,
    phone,
  }: {
    countryCode: string;
    phone: string;
  }) {
    const user = await this.userIdSearchRepos.findUserIdByPhone(
      countryCode,
      phone,
    );

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
  @ToolScopes(['mcp:all'])
  async findUserByEmail({ email }: { email: string }) {
    const user = await this.userIdSearchRepos.findUserIdByEmail(email);

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

  @Tool({
    name: 'search-users-by-username',
    description: 'Search user IDs by username pattern (fuzzy search)',
    parameters: z.object({
      username: z.string().describe('The username pattern to search for'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe('Maximum number of results to return'),
    }),
  })
  @ToolScopes(['mcp:all'])
  async searchUsersByUsername({
    username,
    limit = 10,
  }: {
    username: string;
    limit?: number;
  }) {
    const users = await this.userIdSearchRepos.searchUserIdsByUsername(
      username,
      limit,
    );

    if (users.length === 0) {
      return {
        status: 'success',
        message: `No user IDs found matching username: ${username}`,
        count: 0,
        userIds: [],
      };
    }

    return {
      status: 'success',
      message: `Found ${users.length} user ID(s) matching username: ${username}`,
      count: users.length,
      userIds: users.map((user) => user.id),
    };
  }

  @Tool({
    name: 'search-userids-by-email',
    description: 'Search user IDs by email pattern (fuzzy search)',
    parameters: z.object({
      email: z.string().describe('The email pattern to search for'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe('Maximum number of results to return'),
    }),
  })
  @ToolScopes(['mcp:all'])
  async searchUsersByEmail({
    email,
    limit = 10,
  }: {
    email: string;
    limit?: number;
  }) {
    const users = await this.userIdSearchRepos.searchUserIdsByEmail(
      email,
      limit,
    );

    if (users.length === 0) {
      return {
        status: 'success',
        message: `No user IDs found matching email: ${email}`,
        count: 0,
        userIds: [],
      };
    }

    return {
      status: 'success',
      message: `Found ${users.length} user ID(s) matching email: ${email}`,
      count: users.length,
      userIds: users.map((user) => user.id),
    };
  }

  @Tool({
    name: 'search-userids',
    description:
      'Search user IDs by username or email pattern (combined search)',
    parameters: z.object({
      query: z.string().describe('The search query (username or email)'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe('Maximum number of results to return'),
    }),
  })
  @ToolScopes(['mcp:all'])
  async searchUsers({ query, limit = 10 }: { query: string; limit?: number }) {
    const users = await this.userIdSearchRepos.searchUserIds(query, limit);

    if (users.length === 0) {
      return {
        status: 'success',
        message: `No user IDs found matching query: ${query}`,
        count: 0,
        userIds: [],
      };
    }

    return {
      status: 'success',
      message: `Found ${users.length} user ID(s) matching query: ${query}`,
      count: users.length,
      userIds: users.map((user) => user.id),
    };
  }
}
