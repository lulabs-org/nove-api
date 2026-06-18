/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-05 10:55:08
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-06-18 20:18:00
 * @FilePath: /nove_api/src/api-key/controllers/v1.controller.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Controller, Get, UseInterceptors } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { Auth } from '@/auth/unified/auth.decorator';
import { AuthContext } from '@/auth/unified/auth-context.interface';
import { RequireAuth } from '@/auth/unified/require-auth.decorator';
import { UsageLoggingInterceptor } from '../interceptors/usage-logging.interceptor';

/**
 * V1 外部 API 控制器
 * 使用 API Key 认证（通过统一认证层自动识别）
 */
@ApiTags('External API - V1')
@Controller('v1')
@RequireAuth('api_key')
@UseInterceptors(UsageLoggingInterceptor)
@ApiSecurity('api-key')
export class V1Controller {
  /**
   * 获取当前 API Key 信息（演示端点）
   */
  @Get('me')
  @ApiOperation({
    summary: '获取当前 API Key 信息',
    description: '返回当前 API Key 的组织 ID、Key ID 和权限范围',
  })
  @ApiResponse({
    status: 200,
    description: 'API Key 信息',
    schema: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          example: 'clx1234567890abcdef',
          description: '组织 ID',
        },
        apiKeyId: {
          type: 'string',
          example: 'clx0987654321fedcba',
          description: 'API Key ID',
        },
        scopes: {
          type: 'array',
          items: { type: 'string' },
          example: ['meetings:read', 'meetings:write'],
          description: '权限范围',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'API Key 无效或已过期',
  })
  getMe(@Auth() auth: AuthContext) {
    return {
      orgId: auth.orgId,
      apiKeyId: auth.apiKeyId,
      scopes: auth.permissions,
    };
  }
}
