/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 06:03:05
 * @LastEditors: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @LastEditTime: 2025-10-25 10:54:59
 * @FilePath: \lulab_backend\src\task\dtos\query.dto.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

// src/tasks/dtos/query.dto.ts
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Type(() => Number) // ✅ 字符串转 number
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number) // ✅ 字符串转 number
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt'])
  orderBy?: 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDir?: 'asc' | 'desc';
}
