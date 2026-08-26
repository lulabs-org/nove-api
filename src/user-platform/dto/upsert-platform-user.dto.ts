/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 19:50:17
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 19:51:33
 * @FilePath: /nove_api/src/user-platform/dto/upsert-platform-user.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Platform } from '@prisma/client';

export class UpsertPlatformUserDto {
  @ApiProperty({
    description: '平台类型',
    enum: Platform,
  })
  @IsEnum(Platform)
  @IsNotEmpty()
  platform: Platform;

  @ApiProperty({
    description: '平台联合ID',
    example: 'union_id_123456',
  })
  @IsString()
  @IsNotEmpty()
  ptUnionId: string;

  @ApiProperty({
    description: '平台用户ID',
    example: 'user_123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  ptUserId?: string;

  @ApiProperty({
    description: '显示名称',
    example: '张三',
    required: false,
  })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({
    description: '国家代码',
    example: '+86',
    required: false,
  })
  @IsString()
  @IsOptional()
  countryCode?: string;

  @ApiProperty({
    description: '手机号',
    example: '13800138000',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: '手机号哈希',
    example: 'hashed_phone_value',
    required: false,
  })
  @IsString()
  @IsOptional()
  phoneHash?: string;

  @ApiProperty({
    description: '本地用户ID',
    example: 'local_user_id',
    required: false,
  })
  @IsString()
  @IsOptional()
  localUserId?: string;
}

export class UpsertPlatformUserWhereDto extends PickType(
  UpsertPlatformUserDto,
  ['platform', 'ptUnionId'] as const,
) {}

export class UpsertPlatformUserDataDto extends OmitType(UpsertPlatformUserDto, [
  'platform',
  'ptUnionId',
] as const) {}

export class UpsertPlatformUserRequestDto {
  @ApiProperty({
    description: '用于唯一定位平台用户的条件',
    type: UpsertPlatformUserWhereDto,
  })
  where: UpsertPlatformUserWhereDto;

  @ApiProperty({
    description: '需要写入或更新的平台用户信息',
    type: UpsertPlatformUserDataDto,
  })
  data: UpsertPlatformUserDataDto;
}
