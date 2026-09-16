/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-07-06 05:58:54
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-09-16 13:13:00
 * @FilePath: /nove_api/src/app.controller.ts
 * @Description: System application controller for health checks
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Controller, Get, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Public } from '@/auth/decorators/public.decorator';
import { NoPermissionRequired } from '@/admin/permission/decorators/permissions.decorator';
import { AppService } from './app.service';
import { HealthCheckResponseDto } from './dto/app.dto';

@ApiTags('System')
@Controller()
@UseGuards(ThrottlerGuard)
@NoPermissionRequired()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 允许每秒 1~2 次探活，有效阻断恶意高频刷库
  @ApiOperation({ summary: '系统健康检查 (Health Probe)' })
  @ApiResponse({
    status: 200,
    description: '服务运行正常',
    type: HealthCheckResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: '核心依赖异常 (如数据库不可用)',
    type: HealthCheckResponseDto,
  })
  async health(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthCheckResponseDto> {
    const result = await this.appService.getHealthCheck();
    if (result.status === 'error') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
