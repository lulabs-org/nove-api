/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-08 17:26:51
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-08 17:26:53
 * @FilePath: /lulab_backend/src/auth/decorators/api-docs/get-permissions.docs.decorator.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiHeader, ApiProduces } from '@nestjs/swagger';
import { PermissionsResponseDto } from '../../dto/permissions-response.dto';

export function ApiGetPermissionsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '获取当前用户权限',
      description: '获取当前登录用户的权限列表，包括用户基本信息和所有可用的权限。',
      tags: ['Auth'],
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '成功获取用户权限',
      type: PermissionsResponseDto,
      examples: {
        success: {
          summary: '成功示例',
          value: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: '张三',
            roles: ['user'],
            permissions: ['user:read', 'meeting:create', 'meeting:read'],
          },
        },
        multipleRoles: {
          summary: '多角色示例',
          value: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: '李四',
            roles: ['user', 'manager'],
            permissions: ['user:read', 'meeting:create', 'meeting:read', 'meeting:update', 'meeting:manage'],
          },
        },
        adminRoles: {
          summary: '管理员角色示例',
          value: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: '王五',
            roles: ['admin'],
            permissions: [
              'user:read',
              'user:write',
              'user:delete',
              'meeting:create',
              'meeting:read',
              'meeting:update',
              'meeting:delete',
              'meeting:manage',
              'system:config',
            ],
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
