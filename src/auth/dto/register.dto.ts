/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-28 11:37:14
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-08 15:15:56
 * @FilePath: /lulab_backend/src/auth/dto/register.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { AuthType } from '@/auth/enums';
import { ClientType } from '@/auth/types/jwt.types';

export class RegisterDto {
  @ApiProperty({ description: '注册类型', enum: AuthType })
  @IsEnum(AuthType)
  type: AuthType;

  @ApiProperty({ required: false, description: '用户名' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: '用户名至少3个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username?: string;

  @ApiProperty({ required: false, description: '邮箱' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @ApiProperty({ required: false, description: '国家代码，如 +86' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ required: false, description: '手机号' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    required: false,
    description: '密码，至少6位且包含字母和数字',
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/, {
    message: '密码必须包含至少一个字母和一个数字',
  })
  password?: string;

  @ApiProperty({ required: false, description: '验证码，4-6位数字' })
  @IsOptional()
  @IsString()
  @MinLength(4, { message: '验证码至少4位' })
  code?: string;

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
