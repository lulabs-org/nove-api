/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-17 02:19:39
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-17 02:21:30
 * @FilePath: /nove_project/nove_api/src/organization/dto/create-organization.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    description: '组织名称',
    example: 'Acme Corporation',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '组织编码',
    example: 'ACME',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    description: '组织 Logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({
    description: '组织描述',
    example: 'A leading technology company',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '父组织 ID',
    example: 'clx0987654321fedcba',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description: '组织层级',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({
    description: '排序',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
