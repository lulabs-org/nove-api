/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-28 11:37:14
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-14 11:26:55
 * @FilePath: /lulab_backend/src/auth/dto/refresh-token.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ClientType } from '@/auth/types/jwt.types';

export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsString()
  refreshToken: string;

  @ApiProperty({
    required: false,
    description: '设备信息，如设备型号、操作系统等',
  })
  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @ApiProperty({ required: false, description: '设备ID，用于标识唯一设备' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    required: false,
    description: '客户端类型：web-网页端，app-移动端',
    enum: ClientType,
  })
  @IsOptional()
  @IsEnum(ClientType)
  clientType?: ClientType;
}
