/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-04 17:15:00
 * @Description: OTP 验证码请求与校验 DTO (SendCode, VerifyCode)
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CodeType } from '@/common/enums';

export class SendCodeDto {
  @ApiProperty({ description: '目标邮箱或手机号' })
  @IsString()
  target: string;

  @ApiProperty({ description: '验证码类型', enum: CodeType })
  @IsEnum(CodeType)
  type: CodeType;

  @ApiProperty({
    required: false,
    description: '国家代码，如 +86（手机号时可选）',
  })
  @IsOptional()
  @IsString()
  countryCode?: string;
}

export class VerifyCodeDto {
  @ApiProperty({ description: '目标邮箱或手机号' })
  @IsString()
  target: string;

  @ApiProperty({ description: '验证码，4-6位数字' })
  @IsString()
  @MinLength(4, { message: '验证码至少4位' })
  code: string;

  @ApiProperty({ description: '验证码类型', enum: CodeType })
  @IsEnum(CodeType)
  type: CodeType;
}
