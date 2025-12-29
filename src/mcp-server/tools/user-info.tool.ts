import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';

@Injectable()
export class UserInfoTool {
  @Tool({
    name: 'get-user-info',
    description: 'Get user information by user ID',
    parameters: z.object({
      userId: z.string().describe('The ID of the user to fetch'),
    }),
  })
  getUserInfo({ userId }: { userId: string }) {
    const result = {
      userId,
      status: 'success',
      message: `User info for ID: ${userId}`,
      data: {
        id: userId,
        name: 'Sample User',
        email: 'user@example.com',
        createdAt: new Date().toISOString(),
      },
    };
    return result;
  }

  @Tool({
    name: 'list-users',
    description: 'List all users with pagination',
    parameters: z.object({
      page: z.number().default(1).describe('Page number'),
      limit: z.number().default(10).describe('Items per page'),
    }),
  })
  listUsers({ page, limit }: { page: number; limit: number }) {
    const result = {
      page,
      limit,
      total: 50,
      users: Array.from({ length: Math.min(limit, 5) }, (_, i: number) => ({
        id: `user-${(page - 1) * limit + i + 1}`,
        name: `User ${(page - 1) * limit + i + 1}`,
        email: `user${(page - 1) * limit + i + 1}@example.com`,
      })),
    };
    return result;
  }
}
