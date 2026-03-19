/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-05 10:55:08
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-19 02:50:32
 * @FilePath: /nove_api/src/api-key/controllers/v1.controller.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  Controller,
  Get,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { ApiScopesGuard } from '../guards/api-scopes.guard';
import { Public } from '@/auth/decorators/public.decorator';
import { UsageLoggingInterceptor } from '../interceptors/usage-logging.interceptor';

/**
 * V1 外部 API 控制器
 * 使用 API Key 认证
 */
@ApiTags('External API - V1')
@Controller('v1')
@UseGuards(ApiKeyGuard, ApiScopesGuard)
@UseInterceptors(UsageLoggingInterceptor)
@ApiSecurity('api-key')
export class V1Controller {
  /**
   * 获取当前 API Key 信息（演示端点）
   */
  @Get('me')
  @Public()
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
  getMe(@Req() request: Request) {
    const apiAuth = request.apiAuth!; // Guard 确保 apiAuth 存在

    return {
      orgId: apiAuth.orgId,
      apiKeyId: apiAuth.apiKeyId,
      scopes: apiAuth.scopes,
    };
  }
}
