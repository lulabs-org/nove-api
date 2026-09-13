/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-04 17:15:00
 * @Description: 认证请求 DTO 集合 (Login, Register, RefreshToken, Logout, ResetPassword)
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

export class LoginDto {
  @ApiProperty({ description: '登录类型', enum: AuthType })
  @IsEnum(AuthType)
  type: AuthType;

  @ApiProperty({ required: false, description: '用户名' })
  @IsOptional()
  @IsString()
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

  @ApiProperty({ required: false, description: '密码' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ required: false, description: '验证码' })
  @IsOptional()
  @IsString()
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

export class ResetPasswordDto {
  @ApiProperty({ description: '目标邮箱或手机号' })
  @IsString()
  target: string;

  @ApiProperty({ description: '重置密码验证码' })
  @IsString()
  @MinLength(4, { message: '验证码至少4位' })
  code: string;

  @ApiProperty({ description: '新密码，至少6位且包含字母和数字' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/, {
    message: '密码必须包含至少一个字母和一个数字',
  })
  newPassword: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌', required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string;

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

export class LogoutDto {
  @ApiProperty({
    description:
      '刷新令牌（可选），在不提供 refreshToken 时，撤销该用户的所有 refreshToken。',
    required: false,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiProperty({
    description: '设备信息（可选），用于撤销特定设备的所有令牌',
    required: false,
    example: 'mobile-app-ios',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: '是否撤销所有设备的令牌（可选）',
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  revokeAllDevices?: boolean;

  @ApiProperty({
    required: false,
    description: '客户端类型：web-网页端，app-移动端',
    enum: ClientType,
  })
  @IsOptional()
  @IsEnum(ClientType)
  clientType?: ClientType;
}
