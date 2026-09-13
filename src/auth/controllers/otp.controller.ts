/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-09-04 17:15:00
 * @FilePath: /nove-api/src/auth/controllers/otp.controller.ts
 * @Description: 认证验证码控制器
 *
 * Copyright (c) 2025 by 杨仕明 shiming.y@qq.com, All Rights Reserved.
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OtpService } from '@/auth/services/otp.service';
import { SendCodeDto, VerifyCodeDto } from '@/auth/dto';
import {
  Public,
  ClientInfo,
  type ClientInfoContext,
  ApiSendCodeDocs,
  ApiVerifyCodeDocs,
} from '@/auth/decorators';

@ApiTags('Auth')
@Controller({ path: 'api/auth/otp', version: '1' })
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Public()
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiSendCodeDocs()
  async send(
    @Body() dto: SendCodeDto,
    @ClientInfo() { ip, userAgent }: ClientInfoContext,
  ) {
    return this.otpService.sendCode(
      dto.target,
      dto.type,
      ip,
      userAgent,
      dto.countryCode,
    );
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyCodeDocs()
  async verify(@Body() dto: VerifyCodeDto) {
    return this.otpService.verifyCode(dto.target, dto.code, dto.type);
  }
}
