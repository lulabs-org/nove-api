/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-19 01:17:20
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-20 12:05:51
 * @FilePath: /nove_api/src/org-member/dto/pagination.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsBoolean,
  Max,
  IsIn,
} from 'class-validator';
import { MemberType, MemberStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

const blankStringToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const queryBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};

export class PaginationDto {
  @ApiPropertyOptional({
    description: '页码',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({
    description: '搜索关键字（姓名、工号、邮箱）',
    example: '张三',
  })
  @Transform(blankStringToUndefined)
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '部门 ID 筛选',
    example: 'clx0987654321fedcba',
  })
  @Transform(blankStringToUndefined)
  @IsOptional()
  @IsString()
  deptId?: string;

  @ApiPropertyOptional({
    description: '成员类型筛选',
    enum: MemberType,
    example: MemberType.INTERNAL,
  })
  @Transform(blankStringToUndefined)
  @IsOptional()
  @IsEnum(MemberType)
  type?: MemberType;

  @ApiPropertyOptional({
    description: '成员状态筛选',
    enum: MemberStatus,
    example: MemberStatus.ACTIVE,
  })
  @Transform(blankStringToUndefined)
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiPropertyOptional({
    description: '是否包含子部门成员',
    example: false,
  })
  @Transform(queryBoolean)
  @IsOptional()
  @IsBoolean()
  includeChildren?: boolean;
}

export class MemberRoleOptionQueryDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ description: '姓名或邮箱关键字' })
  @Transform(blankStringToUndefined)
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '角色 ID' })
  @Transform(blankStringToUndefined)
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ enum: ['assigned', 'unassigned'] })
  @Transform(blankStringToUndefined)
  @IsOptional()
  @IsIn(['assigned', 'unassigned'])
  assignment?: 'assigned' | 'unassigned';
}
