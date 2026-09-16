/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-16 11:45:00
 * @FilePath: /nove_api/src/dto/app.dto.ts
 * @Description: App and system health check data transfer objects
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { ApiProperty } from '@nestjs/swagger';

export type HealthStatus = 'ok' | 'error';

export class HealthCheckResponseDto {
  @ApiProperty({
    description: '系统健康状态',
    enum: ['ok', 'error'],
    example: 'ok',
  })
  status: HealthStatus;

  @ApiProperty({
    description: '健康检查时间戳 (ISO 8601)',
    example: '2026-09-16T05:08:00.000Z',
  })
  timestamp: string;
}
