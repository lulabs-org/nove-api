/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-16 13:59:08
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-16 15:18:28
 * @FilePath: /nove_api/src/permission/dto/query-permission.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { PermissionType } from '@prisma/client';
import { Type, Transform } from 'class-transformer';

export class QueryPermissionDto {
  @ApiPropertyOptional({ description: '权限名称（模糊搜索）', example: 'user' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '权限编码', example: 'user:read' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: '资源标识', example: 'user' })
  @IsString()
  @IsOptional()
  resource?: string;

  @ApiPropertyOptional({
    description: '权限类型',
    enum: PermissionType,
    example: PermissionType.API,
  })
  @IsEnum(PermissionType)
  @IsOptional()
  type?: PermissionType;

  @ApiPropertyOptional({ description: '父权限ID' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  active?: boolean;

  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number;
}
