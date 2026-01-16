/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-16 12:47:35
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-16 12:55:45
 * @FilePath: /nove_project/nove_api/src/role/dto/query-role.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsInt } from 'class-validator';
import { RoleType } from '@prisma/client';
import { Type, Transform } from 'class-transformer';

export class QueryRoleDto {
  @ApiPropertyOptional({
    description: '角色名称（模糊搜索）',
    example: 'admin',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '角色编码',
    example: 'admin',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: '角色类型',
    enum: RoleType,
    example: RoleType.CUSTOM,
  })
  @IsEnum(RoleType)
  @IsOptional()
  type?: RoleType;

  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  active?: boolean;

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  pageSize?: number;
}
