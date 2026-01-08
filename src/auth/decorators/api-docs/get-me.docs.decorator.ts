/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-08 17:26:07
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-08 17:26:08
 * @FilePath: /lulab_backend/src/auth/decorators/api-docs/get-me.docs.decorator.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiHeader, ApiProduces } from '@nestjs/swagger';
import { AuthUserResponseDto } from '../../dto/auth-user-response.dto';

export function ApiGetMeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '获取当前用户信息',
      description: '获取当前登录用户的基本信息，包括用户ID、用户名和角色。',
      tags: ['Auth'],
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '成功获取用户信息',
      type: AuthUserResponseDto,
      examples: {
        success: {
          summary: '成功示例',
          value: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: '张三',
            roles: ['user'],
          },
        },
        multipleRoles: {
          summary: '多角色示例',
          value: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: '李四',
            roles: ['user', 'manager'],
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: '未授权，访问令牌无效或已过期',
      schema: {
        example: {
          statusCode: 401,
          message: 'Unauthorized',
          error: 'Unauthorized',
        },
      },
    }),
    ApiHeader({
      name: 'Authorization',
      description: 'Bearer 访问令牌',
      required: true,
      schema: {
        type: 'string',
        example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    }),
  );
}
