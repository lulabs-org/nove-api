/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 19:50:12
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 14:07:54
 * @FilePath: /nove_api/src/user-platform/dto/update-platform-user.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdatePlatformUserDto {
  @ApiPropertyOptional({
    description: '平台用户ID',
    example: 'user_123456',
  })
  @IsString()
  @IsOptional()
  ptUserId?: string;

  @ApiPropertyOptional({
    description: '显示名称',
    example: '张三',
  })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({
    description: '国家代码',
    example: '+86',
  })
  @IsString()
  @IsOptional()
  countryCode?: string;

  @ApiPropertyOptional({
    description: '手机号',
    example: '13800138000',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: '手机号哈希',
    example: 'hashed_phone_value',
  })
  @IsString()
  @IsOptional()
  phoneHash?: string;

  @ApiPropertyOptional({
    description: '本地用户ID',
    example: 'local_user_id',
  })
  @IsString()
  @IsOptional()
  localUserId?: string;

  @ApiPropertyOptional({
    description: '是否激活',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
