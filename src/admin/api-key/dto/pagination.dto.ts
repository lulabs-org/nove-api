/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 14:56:17
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-23 17:45:23
 * @FilePath: /nove_api/src/api-key/dto/pagination.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, IsEnum } from 'class-validator';
import { ApiKeyStatus } from '@prisma/client';

/**
 * 分页查询 DTO
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: '页码（从 1 开始）',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiPropertyOptional({
    description: 'API Key 状态筛选',
    enum: ApiKeyStatus,
    example: ApiKeyStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ApiKeyStatus)
  status?: ApiKeyStatus;
}
