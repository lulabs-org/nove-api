import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';

export function ApiRefreshTokenDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '刷新访问令牌',
      description:
        '使用刷新令牌获取新的访问令牌。当访问令牌过期时，可以使用此接口获取新的访问令牌而无需重新登录。',
      tags: ['Auth'],
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiBody({
      description:
        '刷新令牌请求体。Web 客户端可通过 HttpOnly Cookie 携带 refreshToken。',
      schema: {
        type: 'object',
        properties: {
          refreshToken: {
            type: 'string',
            description:
              '用于换取新访问令牌的刷新令牌；Web 客户端可省略并从 Cookie 读取',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...',
          },
          clientType: {
            type: 'string',
            enum: ['web', 'app'],
            description: '客户端类型：web-网页端，app-移动端',
            example: 'web',
          },
        },
        example: {
          clientType: 'web',
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: '令牌刷新成功，返回新的访问令牌和刷新令牌（令牌轮换）',
      schema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: '新的访问令牌',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          refreshToken: {
            type: 'string',
            description: '新的刷新令牌（令牌轮换后生成的新令牌）',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_refresh...',
          },
        },
        example: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_refresh...',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: '刷新令牌无效或已过期',
      schema: {
        example: {
          statusCode: 401,
          message: '刷新令牌无效或已过期',
          error: 'Unauthorized',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误',
      schema: {
        example: {
          statusCode: 400,
          message: '刷新令牌不能为空',
          error: 'Bad Request',
        },
      },
    }),
    ApiHeader({
      name: 'Content-Type',
      description: '请求内容类型',
      required: true,
      schema: {
        type: 'string',
        default: 'application/json',
      },
    }),
  );
}
