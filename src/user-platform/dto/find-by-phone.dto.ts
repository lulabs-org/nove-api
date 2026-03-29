/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 19:50:38
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 19:50:40
 * @FilePath: /nove_api/src/user-platform/dto/find-by-phone.dto.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Platform } from '@prisma/client';

export class FindByPhoneDto {
  @ApiProperty({
    description: '平台类型',
    enum: Platform,
  })
  @IsEnum(Platform)
  @IsNotEmpty()
  platform: Platform;

  @ApiProperty({
    description: '国家代码',
    example: '+86',
  })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({
    description: '手机号哈希',
    example: 'hashed_phone_value',
  })
  @IsString()
  @IsNotEmpty()
  phoneHash: string;
}
