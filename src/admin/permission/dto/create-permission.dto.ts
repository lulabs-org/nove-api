/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-16 13:59:08
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-16 13:59:53
 * @FilePath: /nove_project/nove_api/src/permission/dto/create-permission.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { PermissionType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreatePermissionDto {
  @ApiProperty({ description: '权限名称', example: '查看用户' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '权限编码', example: 'user:read' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: '权限描述',
    example: '查看用户列表',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '资源标识', example: 'user' })
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiProperty({ description: '操作类型', example: 'read' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({
    description: '权限类型',
    enum: PermissionType,
    example: PermissionType.API,
    default: PermissionType.API,
  })
  @IsEnum(PermissionType)
  @IsOptional()
  type?: PermissionType;

  @ApiProperty({ description: '父权限ID', required: false })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ description: '权限层级', example: 1, default: 1 })
  @IsInt()
  @IsOptional()
  level?: number;

  @ApiProperty({ description: '排序', example: 0, default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ description: '是否启用', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  active?: boolean;
}
